-- ==============================================================================
-- GLA COACH 신규 Supabase 전체 스키마 완전 복원 마스터 SQL
-- 1) 누락된 41개 외래키(Foreign Key) 관계선 일괄 연결 -> Schema Visualizer 완벽 복원
-- 2) 모든 테이블 id DEFAULT gen_random_uuid() 및 타임스탬프 기본값 복원
-- 3) 모든 35개 테이블 RLS 정책 일괄 오픈 -> 권한 위반(42501) 에러 원천 차단
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- [1단계] UUID 확장 기능 활성화
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- [2단계] 모든 테이블 id 및 타임스탬프 기본값(DEFAULT) 일괄 부여
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.tournaments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.tournaments ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.consultations ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.consultations ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.records ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.records ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.records ALTER COLUMN inserted_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.tournament_results ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.tournament_results ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.poll_responses ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.poll_responses ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.training_sessions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.training_sessions ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.scorecards ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.scorecards ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.scorecard_holes ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.scorecard_holes ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.role_permissions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.role_permissions ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.tournament_leaderboards ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.scorecard_summary ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.scorecard_summary ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.scorecard_shots ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.scorecard_shots ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.test_sessions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.test_sessions ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.test_sessions ALTER COLUMN inserted_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.polls ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.polls ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.monthly_assignments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.monthly_assignments ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.challenge_templates ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.challenge_templates ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.score_tournaments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.score_tournaments ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.schedules ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.schedules ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.notices ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.notices ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.training_templates ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.training_templates ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.tournament_marker_scores ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.tournament_marker_scores ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.tournament_participants ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.todos ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.todos ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.lesson_templates ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.lesson_templates ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.login_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.login_logs ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.player_reports ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.player_reports ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.comments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.comments ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.coach_trips ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.coach_trips ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.attendance ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.parent_athlete_mappings ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.parent_athlete_mappings ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.users ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.user_activity_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS public.user_activity_logs ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- [3단계] 41개 외래키(Foreign Key) 제약조건 연결 (Schema Visualizer 연결선 복원)
-- ------------------------------------------------------------------------------
DELETE FROM public.consultations WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.consultations DROP CONSTRAINT IF EXISTS consultations_user_id_fkey;
ALTER TABLE IF EXISTS public.consultations ADD CONSTRAINT consultations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

UPDATE public.consultations SET coach_id = NULL WHERE coach_id IS NOT NULL AND coach_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.consultations DROP CONSTRAINT IF EXISTS consultations_coach_id_fkey;
ALTER TABLE IF EXISTS public.consultations ADD CONSTRAINT consultations_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE SET NULL;

DELETE FROM public.records WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.records DROP CONSTRAINT IF EXISTS records_user_id_fkey;
ALTER TABLE IF EXISTS public.records ADD CONSTRAINT records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

UPDATE public.records SET coach_id = NULL WHERE coach_id IS NOT NULL AND coach_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.records DROP CONSTRAINT IF EXISTS records_coach_id_fkey;
ALTER TABLE IF EXISTS public.records ADD CONSTRAINT records_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE SET NULL;

DELETE FROM public.tournament_results WHERE tournament_id IS NOT NULL AND tournament_id NOT IN (SELECT id FROM public.score_tournaments);
ALTER TABLE IF EXISTS public.tournament_results DROP CONSTRAINT IF EXISTS tournament_results_tournament_id_fkey;
ALTER TABLE IF EXISTS public.tournament_results ADD CONSTRAINT tournament_results_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.score_tournaments(id) ON DELETE CASCADE;

DELETE FROM public.poll_responses WHERE poll_id IS NOT NULL AND poll_id NOT IN (SELECT id FROM public.polls);
ALTER TABLE IF EXISTS public.poll_responses DROP CONSTRAINT IF EXISTS poll_responses_poll_id_fkey;
ALTER TABLE IF EXISTS public.poll_responses ADD CONSTRAINT poll_responses_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE;

DELETE FROM public.poll_responses WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.poll_responses DROP CONSTRAINT IF EXISTS poll_responses_user_id_fkey;
ALTER TABLE IF EXISTS public.poll_responses ADD CONSTRAINT poll_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

DELETE FROM public.training_sessions WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.training_sessions DROP CONSTRAINT IF EXISTS training_sessions_user_id_fkey;
ALTER TABLE IF EXISTS public.training_sessions ADD CONSTRAINT training_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

UPDATE public.training_sessions SET coach_id = NULL WHERE coach_id IS NOT NULL AND coach_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.training_sessions DROP CONSTRAINT IF EXISTS training_sessions_coach_id_fkey;
ALTER TABLE IF EXISTS public.training_sessions ADD CONSTRAINT training_sessions_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE SET NULL;

DELETE FROM public.scorecards WHERE athlete_id IS NOT NULL AND athlete_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.scorecards DROP CONSTRAINT IF EXISTS scorecards_athlete_id_fkey;
ALTER TABLE IF EXISTS public.scorecards ADD CONSTRAINT scorecards_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(id) ON DELETE CASCADE;

UPDATE public.scorecards SET coach_id = NULL WHERE coach_id IS NOT NULL AND coach_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.scorecards DROP CONSTRAINT IF EXISTS scorecards_coach_id_fkey;
ALTER TABLE IF EXISTS public.scorecards ADD CONSTRAINT scorecards_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE SET NULL;

UPDATE public.scorecards SET tournament_id = NULL WHERE tournament_id IS NOT NULL AND tournament_id NOT IN (SELECT id FROM public.score_tournaments);
ALTER TABLE IF EXISTS public.scorecards DROP CONSTRAINT IF EXISTS scorecards_tournament_id_fkey;
ALTER TABLE IF EXISTS public.scorecards ADD CONSTRAINT scorecards_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.score_tournaments(id) ON DELETE SET NULL;

UPDATE public.scorecards SET marker_id = NULL WHERE marker_id IS NOT NULL AND marker_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.scorecards DROP CONSTRAINT IF EXISTS scorecards_marker_id_fkey;
ALTER TABLE IF EXISTS public.scorecards ADD CONSTRAINT scorecards_marker_id_fkey FOREIGN KEY (marker_id) REFERENCES public.users(id) ON DELETE SET NULL;

DELETE FROM public.scorecard_holes WHERE scorecard_id IS NOT NULL AND scorecard_id NOT IN (SELECT id FROM public.scorecards);
ALTER TABLE IF EXISTS public.scorecard_holes DROP CONSTRAINT IF EXISTS scorecard_holes_scorecard_id_fkey;
ALTER TABLE IF EXISTS public.scorecard_holes ADD CONSTRAINT scorecard_holes_scorecard_id_fkey FOREIGN KEY (scorecard_id) REFERENCES public.scorecards(id) ON DELETE CASCADE;

DELETE FROM public.tournament_leaderboards WHERE tournament_id IS NOT NULL AND tournament_id NOT IN (SELECT id FROM public.score_tournaments);
ALTER TABLE IF EXISTS public.tournament_leaderboards DROP CONSTRAINT IF EXISTS tournament_leaderboards_tournament_id_fkey;
ALTER TABLE IF EXISTS public.tournament_leaderboards ADD CONSTRAINT tournament_leaderboards_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.score_tournaments(id) ON DELETE CASCADE;

DELETE FROM public.tournament_leaderboards WHERE athlete_id IS NOT NULL AND athlete_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.tournament_leaderboards DROP CONSTRAINT IF EXISTS tournament_leaderboards_athlete_id_fkey;
ALTER TABLE IF EXISTS public.tournament_leaderboards ADD CONSTRAINT tournament_leaderboards_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(id) ON DELETE CASCADE;

DELETE FROM public.scorecard_summary WHERE scorecard_id IS NOT NULL AND scorecard_id NOT IN (SELECT id FROM public.scorecards);
ALTER TABLE IF EXISTS public.scorecard_summary DROP CONSTRAINT IF EXISTS scorecard_summary_scorecard_id_fkey;
ALTER TABLE IF EXISTS public.scorecard_summary ADD CONSTRAINT scorecard_summary_scorecard_id_fkey FOREIGN KEY (scorecard_id) REFERENCES public.scorecards(id) ON DELETE CASCADE;

DELETE FROM public.scorecard_summary WHERE athlete_id IS NOT NULL AND athlete_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.scorecard_summary DROP CONSTRAINT IF EXISTS scorecard_summary_athlete_id_fkey;
ALTER TABLE IF EXISTS public.scorecard_summary ADD CONSTRAINT scorecard_summary_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(id) ON DELETE CASCADE;

DELETE FROM public.scorecard_shots WHERE hole_id IS NOT NULL AND hole_id NOT IN (SELECT id FROM public.scorecard_holes);
ALTER TABLE IF EXISTS public.scorecard_shots DROP CONSTRAINT IF EXISTS scorecard_shots_hole_id_fkey;
ALTER TABLE IF EXISTS public.scorecard_shots ADD CONSTRAINT scorecard_shots_hole_id_fkey FOREIGN KEY (hole_id) REFERENCES public.scorecard_holes(id) ON DELETE CASCADE;

DELETE FROM public.scorecard_shots WHERE scorecard_id IS NOT NULL AND scorecard_id NOT IN (SELECT id FROM public.scorecards);
ALTER TABLE IF EXISTS public.scorecard_shots DROP CONSTRAINT IF EXISTS scorecard_shots_scorecard_id_fkey;
ALTER TABLE IF EXISTS public.scorecard_shots ADD CONSTRAINT scorecard_shots_scorecard_id_fkey FOREIGN KEY (scorecard_id) REFERENCES public.scorecards(id) ON DELETE CASCADE;

DELETE FROM public.test_sessions WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.test_sessions DROP CONSTRAINT IF EXISTS test_sessions_user_id_fkey;
ALTER TABLE IF EXISTS public.test_sessions ADD CONSTRAINT test_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

UPDATE public.test_sessions SET coach_id = NULL WHERE coach_id IS NOT NULL AND coach_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.test_sessions DROP CONSTRAINT IF EXISTS test_sessions_coach_id_fkey;
ALTER TABLE IF EXISTS public.test_sessions ADD CONSTRAINT test_sessions_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE SET NULL;

UPDATE public.polls SET author_id = NULL WHERE author_id IS NOT NULL AND author_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.polls DROP CONSTRAINT IF EXISTS polls_author_id_fkey;
ALTER TABLE IF EXISTS public.polls ADD CONSTRAINT polls_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;

DELETE FROM public.monthly_assignments WHERE athlete_id IS NOT NULL AND athlete_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.monthly_assignments DROP CONSTRAINT IF EXISTS monthly_assignments_athlete_id_fkey;
ALTER TABLE IF EXISTS public.monthly_assignments ADD CONSTRAINT monthly_assignments_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(id) ON DELETE CASCADE;

UPDATE public.monthly_assignments SET coach_id = NULL WHERE coach_id IS NOT NULL AND coach_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.monthly_assignments DROP CONSTRAINT IF EXISTS monthly_assignments_coach_id_fkey;
ALTER TABLE IF EXISTS public.monthly_assignments ADD CONSTRAINT monthly_assignments_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE SET NULL;

DELETE FROM public.schedules WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.schedules DROP CONSTRAINT IF EXISTS schedules_user_id_fkey;
ALTER TABLE IF EXISTS public.schedules ADD CONSTRAINT schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

DELETE FROM public.schedules WHERE creator_id IS NOT NULL AND creator_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.schedules DROP CONSTRAINT IF EXISTS schedules_creator_id_fkey;
ALTER TABLE IF EXISTS public.schedules ADD CONSTRAINT schedules_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE CASCADE;

UPDATE public.notices SET author_id = NULL WHERE author_id IS NOT NULL AND author_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.notices DROP CONSTRAINT IF EXISTS notices_author_id_fkey;
ALTER TABLE IF EXISTS public.notices ADD CONSTRAINT notices_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;

DELETE FROM public.tournament_marker_scores WHERE scorecard_id IS NOT NULL AND scorecard_id NOT IN (SELECT id FROM public.scorecards);
ALTER TABLE IF EXISTS public.tournament_marker_scores DROP CONSTRAINT IF EXISTS tournament_marker_scores_scorecard_id_fkey;
ALTER TABLE IF EXISTS public.tournament_marker_scores ADD CONSTRAINT tournament_marker_scores_scorecard_id_fkey FOREIGN KEY (scorecard_id) REFERENCES public.scorecards(id) ON DELETE CASCADE;

DELETE FROM public.tournament_participants WHERE tournament_id IS NOT NULL AND tournament_id NOT IN (SELECT id FROM public.score_tournaments);
ALTER TABLE IF EXISTS public.tournament_participants DROP CONSTRAINT IF EXISTS tournament_participants_tournament_id_fkey;
ALTER TABLE IF EXISTS public.tournament_participants ADD CONSTRAINT tournament_participants_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.score_tournaments(id) ON DELETE CASCADE;

DELETE FROM public.tournament_participants WHERE athlete_id IS NOT NULL AND athlete_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.tournament_participants DROP CONSTRAINT IF EXISTS tournament_participants_athlete_id_fkey;
ALTER TABLE IF EXISTS public.tournament_participants ADD CONSTRAINT tournament_participants_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(id) ON DELETE CASCADE;

DELETE FROM public.todos WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.todos DROP CONSTRAINT IF EXISTS todos_user_id_fkey;
ALTER TABLE IF EXISTS public.todos ADD CONSTRAINT todos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

DELETE FROM public.login_logs WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.login_logs DROP CONSTRAINT IF EXISTS login_logs_user_id_fkey;
ALTER TABLE IF EXISTS public.login_logs ADD CONSTRAINT login_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

DELETE FROM public.player_reports WHERE athlete_id IS NOT NULL AND athlete_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.player_reports DROP CONSTRAINT IF EXISTS player_reports_athlete_id_fkey;
ALTER TABLE IF EXISTS public.player_reports ADD CONSTRAINT player_reports_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(id) ON DELETE CASCADE;

UPDATE public.player_reports SET coach_id = NULL WHERE coach_id IS NOT NULL AND coach_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.player_reports DROP CONSTRAINT IF EXISTS player_reports_coach_id_fkey;
ALTER TABLE IF EXISTS public.player_reports ADD CONSTRAINT player_reports_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE SET NULL;

DELETE FROM public.comments WHERE record_id IS NOT NULL AND record_id NOT IN (SELECT id FROM public.records);
ALTER TABLE IF EXISTS public.comments DROP CONSTRAINT IF EXISTS comments_record_id_fkey;
ALTER TABLE IF EXISTS public.comments ADD CONSTRAINT comments_record_id_fkey FOREIGN KEY (record_id) REFERENCES public.records(id) ON DELETE CASCADE;

DELETE FROM public.comments WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE IF EXISTS public.comments ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

DELETE FROM public.attendance WHERE athlete_id IS NOT NULL AND athlete_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.attendance DROP CONSTRAINT IF EXISTS attendance_athlete_id_fkey;
ALTER TABLE IF EXISTS public.attendance ADD CONSTRAINT attendance_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(id) ON DELETE CASCADE;

DELETE FROM public.parent_athlete_mappings WHERE parent_id IS NOT NULL AND parent_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.parent_athlete_mappings DROP CONSTRAINT IF EXISTS parent_athlete_mappings_parent_id_fkey;
ALTER TABLE IF EXISTS public.parent_athlete_mappings ADD CONSTRAINT parent_athlete_mappings_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;

DELETE FROM public.parent_athlete_mappings WHERE athlete_id IS NOT NULL AND athlete_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.parent_athlete_mappings DROP CONSTRAINT IF EXISTS parent_athlete_mappings_athlete_id_fkey;
ALTER TABLE IF EXISTS public.parent_athlete_mappings ADD CONSTRAINT parent_athlete_mappings_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(id) ON DELETE CASCADE;

DELETE FROM public.user_activity_logs WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
ALTER TABLE IF EXISTS public.user_activity_logs DROP CONSTRAINT IF EXISTS user_activity_logs_user_id_fkey;
ALTER TABLE IF EXISTS public.user_activity_logs ADD CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ------------------------------------------------------------------------------
-- [4단계] 모든 35개 테이블 RLS 권한 일괄 부여 (인증 사용자 전체 접근 + 조회 허용)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.tournaments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on tournaments" ON public.tournaments;
CREATE POLICY "Allow all for authenticated on tournaments" ON public.tournaments FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for tournaments" ON public.tournaments;
CREATE POLICY "Allow public read access for tournaments" ON public.tournaments FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.consultations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on consultations" ON public.consultations;
CREATE POLICY "Allow all for authenticated on consultations" ON public.consultations FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for consultations" ON public.consultations;
CREATE POLICY "Allow public read access for consultations" ON public.consultations FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on records" ON public.records;
CREATE POLICY "Allow all for authenticated on records" ON public.records FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for records" ON public.records;
CREATE POLICY "Allow public read access for records" ON public.records FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.tournament_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on tournament_results" ON public.tournament_results;
CREATE POLICY "Allow all for authenticated on tournament_results" ON public.tournament_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for tournament_results" ON public.tournament_results;
CREATE POLICY "Allow public read access for tournament_results" ON public.tournament_results FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.poll_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on poll_responses" ON public.poll_responses;
CREATE POLICY "Allow all for authenticated on poll_responses" ON public.poll_responses FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for poll_responses" ON public.poll_responses;
CREATE POLICY "Allow public read access for poll_responses" ON public.poll_responses FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.training_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on training_sessions" ON public.training_sessions;
CREATE POLICY "Allow all for authenticated on training_sessions" ON public.training_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for training_sessions" ON public.training_sessions;
CREATE POLICY "Allow public read access for training_sessions" ON public.training_sessions FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.scorecards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on scorecards" ON public.scorecards;
CREATE POLICY "Allow all for authenticated on scorecards" ON public.scorecards FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for scorecards" ON public.scorecards;
CREATE POLICY "Allow public read access for scorecards" ON public.scorecards FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.scorecard_holes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on scorecard_holes" ON public.scorecard_holes;
CREATE POLICY "Allow all for authenticated on scorecard_holes" ON public.scorecard_holes FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for scorecard_holes" ON public.scorecard_holes;
CREATE POLICY "Allow public read access for scorecard_holes" ON public.scorecard_holes FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on role_permissions" ON public.role_permissions;
CREATE POLICY "Allow all for authenticated on role_permissions" ON public.role_permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for role_permissions" ON public.role_permissions;
CREATE POLICY "Allow public read access for role_permissions" ON public.role_permissions FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.tournament_leaderboards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on tournament_leaderboards" ON public.tournament_leaderboards;
CREATE POLICY "Allow all for authenticated on tournament_leaderboards" ON public.tournament_leaderboards FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for tournament_leaderboards" ON public.tournament_leaderboards;
CREATE POLICY "Allow public read access for tournament_leaderboards" ON public.tournament_leaderboards FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.scorecard_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on scorecard_summary" ON public.scorecard_summary;
CREATE POLICY "Allow all for authenticated on scorecard_summary" ON public.scorecard_summary FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for scorecard_summary" ON public.scorecard_summary;
CREATE POLICY "Allow public read access for scorecard_summary" ON public.scorecard_summary FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.scorecard_shots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on scorecard_shots" ON public.scorecard_shots;
CREATE POLICY "Allow all for authenticated on scorecard_shots" ON public.scorecard_shots FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for scorecard_shots" ON public.scorecard_shots;
CREATE POLICY "Allow public read access for scorecard_shots" ON public.scorecard_shots FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.test_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on test_sessions" ON public.test_sessions;
CREATE POLICY "Allow all for authenticated on test_sessions" ON public.test_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for test_sessions" ON public.test_sessions;
CREATE POLICY "Allow public read access for test_sessions" ON public.test_sessions FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.polls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on polls" ON public.polls;
CREATE POLICY "Allow all for authenticated on polls" ON public.polls FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for polls" ON public.polls;
CREATE POLICY "Allow public read access for polls" ON public.polls FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.monthly_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on monthly_assignments" ON public.monthly_assignments;
CREATE POLICY "Allow all for authenticated on monthly_assignments" ON public.monthly_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for monthly_assignments" ON public.monthly_assignments;
CREATE POLICY "Allow public read access for monthly_assignments" ON public.monthly_assignments FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.challenge_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on challenge_templates" ON public.challenge_templates;
CREATE POLICY "Allow all for authenticated on challenge_templates" ON public.challenge_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for challenge_templates" ON public.challenge_templates;
CREATE POLICY "Allow public read access for challenge_templates" ON public.challenge_templates FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.score_tournaments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on score_tournaments" ON public.score_tournaments;
CREATE POLICY "Allow all for authenticated on score_tournaments" ON public.score_tournaments FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for score_tournaments" ON public.score_tournaments;
CREATE POLICY "Allow public read access for score_tournaments" ON public.score_tournaments FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on schedules" ON public.schedules;
CREATE POLICY "Allow all for authenticated on schedules" ON public.schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for schedules" ON public.schedules;
CREATE POLICY "Allow public read access for schedules" ON public.schedules FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on notices" ON public.notices;
CREATE POLICY "Allow all for authenticated on notices" ON public.notices FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for notices" ON public.notices;
CREATE POLICY "Allow public read access for notices" ON public.notices FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.training_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on training_templates" ON public.training_templates;
CREATE POLICY "Allow all for authenticated on training_templates" ON public.training_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for training_templates" ON public.training_templates;
CREATE POLICY "Allow public read access for training_templates" ON public.training_templates FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.tournament_marker_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on tournament_marker_scores" ON public.tournament_marker_scores;
CREATE POLICY "Allow all for authenticated on tournament_marker_scores" ON public.tournament_marker_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for tournament_marker_scores" ON public.tournament_marker_scores;
CREATE POLICY "Allow public read access for tournament_marker_scores" ON public.tournament_marker_scores FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.sg_location_penalty ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on sg_location_penalty" ON public.sg_location_penalty;
CREATE POLICY "Allow all for authenticated on sg_location_penalty" ON public.sg_location_penalty FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for sg_location_penalty" ON public.sg_location_penalty;
CREATE POLICY "Allow public read access for sg_location_penalty" ON public.sg_location_penalty FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.tournament_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on tournament_participants" ON public.tournament_participants;
CREATE POLICY "Allow all for authenticated on tournament_participants" ON public.tournament_participants FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for tournament_participants" ON public.tournament_participants;
CREATE POLICY "Allow public read access for tournament_participants" ON public.tournament_participants FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.todos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on todos" ON public.todos;
CREATE POLICY "Allow all for authenticated on todos" ON public.todos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for todos" ON public.todos;
CREATE POLICY "Allow public read access for todos" ON public.todos FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.lesson_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on lesson_templates" ON public.lesson_templates;
CREATE POLICY "Allow all for authenticated on lesson_templates" ON public.lesson_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for lesson_templates" ON public.lesson_templates;
CREATE POLICY "Allow public read access for lesson_templates" ON public.lesson_templates FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.login_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on login_logs" ON public.login_logs;
CREATE POLICY "Allow all for authenticated on login_logs" ON public.login_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for login_logs" ON public.login_logs;
CREATE POLICY "Allow public read access for login_logs" ON public.login_logs FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.player_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on player_reports" ON public.player_reports;
CREATE POLICY "Allow all for authenticated on player_reports" ON public.player_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for player_reports" ON public.player_reports;
CREATE POLICY "Allow public read access for player_reports" ON public.player_reports FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on comments" ON public.comments;
CREATE POLICY "Allow all for authenticated on comments" ON public.comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for comments" ON public.comments;
CREATE POLICY "Allow public read access for comments" ON public.comments FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.coach_trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on coach_trips" ON public.coach_trips;
CREATE POLICY "Allow all for authenticated on coach_trips" ON public.coach_trips FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for coach_trips" ON public.coach_trips;
CREATE POLICY "Allow public read access for coach_trips" ON public.coach_trips FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on attendance" ON public.attendance;
CREATE POLICY "Allow all for authenticated on attendance" ON public.attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for attendance" ON public.attendance;
CREATE POLICY "Allow public read access for attendance" ON public.attendance FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.parent_athlete_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on parent_athlete_mappings" ON public.parent_athlete_mappings;
CREATE POLICY "Allow all for authenticated on parent_athlete_mappings" ON public.parent_athlete_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for parent_athlete_mappings" ON public.parent_athlete_mappings;
CREATE POLICY "Allow public read access for parent_athlete_mappings" ON public.parent_athlete_mappings FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on users" ON public.users;
CREATE POLICY "Allow all for authenticated on users" ON public.users FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for users" ON public.users;
CREATE POLICY "Allow public read access for users" ON public.users FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.sg_par5_adjustment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on sg_par5_adjustment" ON public.sg_par5_adjustment;
CREATE POLICY "Allow all for authenticated on sg_par5_adjustment" ON public.sg_par5_adjustment FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for sg_par5_adjustment" ON public.sg_par5_adjustment;
CREATE POLICY "Allow public read access for sg_par5_adjustment" ON public.sg_par5_adjustment FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.sg_baseline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on sg_baseline" ON public.sg_baseline;
CREATE POLICY "Allow all for authenticated on sg_baseline" ON public.sg_baseline FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for sg_baseline" ON public.sg_baseline;
CREATE POLICY "Allow public read access for sg_baseline" ON public.sg_baseline FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.user_activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated on user_activity_logs" ON public.user_activity_logs;
CREATE POLICY "Allow all for authenticated on user_activity_logs" ON public.user_activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access for user_activity_logs" ON public.user_activity_logs;
CREATE POLICY "Allow public read access for user_activity_logs" ON public.user_activity_logs FOR SELECT USING (true);

