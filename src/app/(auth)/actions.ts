'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()
    const adminSupabase = await createAdminClient()

    const email = (formData.get('email') as string)?.trim()
    const password = formData.get('password') as string

    if (!email || !password) {
        redirect('/login?message=' + encodeURIComponent('이메일과 비밀번호를 모두 입력해주세요.'))
    }

    let { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    // 이메일 미인증으로 인한 로그인 실패 시, 관리자 권한으로 자동 인증 처리 후 재시도
    if (error && (error.message.includes('Email not confirmed') || error.message.includes('not confirmed'))) {
        try {
            const { data: { users } } = await adminSupabase.auth.admin.listUsers()
            const targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
            if (targetUser) {
                // 이메일 자동 인증
                await adminSupabase.auth.admin.updateUserById(targetUser.id, { email_confirm: true })

                // public.users 테이블 동기화 보장
                await adminSupabase.from('users').upsert({
                    id: targetUser.id,
                    name: targetUser.user_metadata?.name || 'User',
                    role: targetUser.user_metadata?.role || 'athlete',
                    phone: targetUser.user_metadata?.phone,
                    branch: targetUser.user_metadata?.branch,
                    created_at: targetUser.created_at || new Date().toISOString(),
                }, { onConflict: 'id' })

                // 재로그인 시도
                const retry = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                authData = retry.data
                error = retry.error
            }
        } catch (e) {
            console.error('Auto-confirm retry error:', e)
        }
    }

    if (error) {
        let msg = '이메일 또는 비밀번호가 올바르지 않습니다.'
        if (error.message.includes('Email not confirmed')) {
            msg = '이메일 인증이 완료되지 않았습니다. 관리자에게 문의해주세요.'
        }
        redirect('/login?message=' + encodeURIComponent(msg))
    }

    if (authData.user) {
        try {
            // RLS 우회를 위해 adminSupabase로 활동 로그 기록
            await adminSupabase.from('login_logs').insert([{ user_id: authData.user.id }])
            await adminSupabase.from('user_activity_logs').insert([{ user_id: authData.user.id, activity_type: 'login' }])

            // public.users에 프로필이 없으면 동기화
            const { data: existingProfile } = await adminSupabase.from('users').select('id').eq('id', authData.user.id).maybeSingle()
            if (!existingProfile) {
                await adminSupabase.from('users').insert([{
                    id: authData.user.id,
                    name: authData.user.user_metadata?.name || 'User',
                    role: authData.user.user_metadata?.role || 'athlete',
                    phone: authData.user.user_metadata?.phone,
                    branch: authData.user.user_metadata?.branch,
                    created_at: new Date().toISOString(),
                }])
            }
        } catch (e) {
            console.error('Log or profile sync error:', e)
        }
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()
    const adminSupabase = await createAdminClient()

    const email = (formData.get('email') as string)?.trim()
    const password = formData.get('password') as string
    const name = (formData.get('name') as string)?.trim()
    const role = formData.get('role') as string
    const phone = (formData.get('phone') as string)?.trim()
    const branch = (formData.get('branch') as string)?.trim() || null
    const marketingAgreed = formData.get('marketing_agreed') === 'true'
    const athleteId = formData.get('athlete_id') as string | null

    if (!email || !password || !name) {
        return { success: false, error: '필수 정보를 모두 입력해주세요.' }
    }

    // 중복 확인 (학부모가 아닌 경우: 이름 또는 전화번호 중복 차단)
    if (role !== 'parent') {
        const { data: existingUser } = await adminSupabase
            .from('users')
            .select('id, name, phone')
            .or(`name.eq.${name},phone.eq.${phone}`)
            .limit(1)
            .maybeSingle()

        if (existingUser) {
            if (existingUser.name === name) {
                return { success: false, error: '동일한 이름으로 가입된 계정이 이미 존재합니다. (동명이인 불가)' }
            } else {
                return { success: false, error: '동일한 전화번호로 가입된 계정이 이미 존재합니다.' }
            }
        }
    }

    // 1. Supabase Auth 계정 생성 (email_confirm: true 로 이메일 인증 절차 없이 즉시 활성화)
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            name,
            role,
            phone,
            branch,
            is_marketing_agreed: marketingAgreed,
        },
    })

    if (authError) {
        let errorMessage = authError.message
        if (
            authError.message.includes('already registered') ||
            authError.message.includes('already exists') ||
            authError.message.includes('User already registered')
        ) {
            errorMessage = '이미 가입된 이메일입니다.'
        }
        return { success: false, error: errorMessage }
    }

    const userId = authData.user.id

    // 2. public.users 테이블에 사용자 프로필 등록 (created_at 포함)
    const { error: profileError } = await adminSupabase.from('users').upsert({
        id: userId,
        name,
        role,
        phone,
        branch,
        created_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    if (profileError) {
        console.error('Failed to create user profile in public.users:', profileError)
    }

    // 3. 학부모 계정인 경우 선수 매핑 등록
    if (role === 'parent' && athleteId) {
        try {
            await adminSupabase.from('parent_athlete_mappings').insert({
                parent_id: userId,
                athlete_id: athleteId,
            })
        } catch (e) {
            console.error('Failed to link parent athlete mapping:', e)
        }
    }

    // 4. 회원가입 완료 즉시 자동 로그인 세션 생성
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (signInError) {
        console.error('Auto login after signup failed:', signInError)
        return { success: true, redirectUrl: '/login?message=' + encodeURIComponent('회원가입이 완료되었습니다. 로그인해주세요.') }
    }

    // 로그인 로그 기록
    try {
        await adminSupabase.from('login_logs').insert([{ user_id: userId }])
        await adminSupabase.from('user_activity_logs').insert([{ user_id: userId, activity_type: 'login' }])
    } catch (e) {
        console.error('Log error:', e)
    }

    revalidatePath('/', 'layout')
    return { success: true, redirectUrl: '/' }
}

