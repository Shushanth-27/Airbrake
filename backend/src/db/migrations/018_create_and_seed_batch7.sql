-- Migration 018: Create and seed batch 7 (11 projects)

CREATE TABLE IF NOT EXISTS "Peer_Review_Critique" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Peer Review Critique',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Gen_AI_-_Email_Assistant" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Gen AI - Email Assistant',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Chatbot_Assistant" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Chatbot Assistant',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Gen_AI-Image_Analytics" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Gen AI-Image Analytics',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Gen_AI_-_Papers_to_Audio" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Gen AI - Papers to Audio',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Scientific_Illustration_Generator" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Scientific Illustration Generator',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Gen_AI_-_Voice_audit_System" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Gen AI - Voice audit System',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "GenAI_Anonymization_Tool" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'GenAI Anonymization Tool',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "AI_Content_Detector" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'AI Content Detector',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "TandF_Rubriq_proessing" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'TandF Rubriq proessing',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "TandF_LAT_Score_for_tracks" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'TandF LAT Score for tracks',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);

-- Peer Review Critique — 36 rows
INSERT INTO "Peer_Review_Critique" VALUES
  (gen_random_uuid(),'Peer Review Critique','paper_1.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_2.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_3.pdf',NOW(),0,1,'Critique generation failed'),
  (gen_random_uuid(),'Peer Review Critique','paper_4.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_5.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_6.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_7.pdf',NOW(),0,1,'LLM response empty'),
  (gen_random_uuid(),'Peer Review Critique','paper_8.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_9.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_10.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_11.pdf',NOW(),0,1,'Token limit exceeded'),
  (gen_random_uuid(),'Peer Review Critique','paper_12.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_13.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_14.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_15.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_16.pdf',NOW(),0,1,'API rate limit'),
  (gen_random_uuid(),'Peer Review Critique','paper_17.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_18.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_19.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_20.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_21.pdf',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Peer Review Critique','paper_22.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_23.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_24.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_25.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_26.pdf',NOW(),0,1,'Malformed response'),
  (gen_random_uuid(),'Peer Review Critique','paper_27.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_28.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_29.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_30.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_31.pdf',NOW(),0,1,'Duplicate submission'),
  (gen_random_uuid(),'Peer Review Critique','paper_32.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_33.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_34.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_35.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Review Critique','paper_36.pdf',NOW(),1,0,NULL);

-- Gen AI - Email Assistant — 17 rows
INSERT INTO "Gen_AI_-_Email_Assistant" VALUES
  (gen_random_uuid(),'Gen AI - Email Assistant','email_1.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Email Assistant','email_2.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Email Assistant','email_3.txt',NOW(),0,1,'Draft generation failed'),
  (gen_random_uuid(),'Gen AI - Email Assistant','email_4.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Email Assistant','email_5.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Email Assistant','email_6.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Email Assistant','email_7.txt',NOW(),0,1,'Tone detection failed'),
  (gen_random_uuid(),'Gen AI - Email Assistant','email_8.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Email Assistant','email_9.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Email Assistant','email_10.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Email Assistant','email_11.txt',NOW(),0,1,'Token limit exceeded'),
  (gen_random_uuid(),'Gen AI - Email Assistant','email_12.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Email Assistant','email_13.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Email Assistant','email_14.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Email Assistant','email_15.txt',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Gen AI - Email Assistant','email_16.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Email Assistant','email_17.txt',NOW(),1,0,NULL);

-- Chatbot Assistant — 25 rows
INSERT INTO "Chatbot_Assistant" VALUES
  (gen_random_uuid(),'Chatbot Assistant','session_1.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_2.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_3.json',NOW(),0,1,'Intent not recognized'),
  (gen_random_uuid(),'Chatbot Assistant','session_4.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_5.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_6.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_7.json',NOW(),0,1,'Context window exceeded'),
  (gen_random_uuid(),'Chatbot Assistant','session_8.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_9.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_10.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_11.json',NOW(),0,1,'Response timeout'),
  (gen_random_uuid(),'Chatbot Assistant','session_12.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_13.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_14.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_15.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_16.json',NOW(),0,1,'Model unavailable'),
  (gen_random_uuid(),'Chatbot Assistant','session_17.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_18.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_19.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_20.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_21.json',NOW(),0,1,'Empty input'),
  (gen_random_uuid(),'Chatbot Assistant','session_22.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_23.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_24.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot Assistant','session_25.json',NOW(),1,0,NULL);

-- Gen AI-Image Analytics — 13 rows
INSERT INTO "Gen_AI-Image_Analytics" VALUES
  (gen_random_uuid(),'Gen AI-Image Analytics','img_1.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI-Image Analytics','img_2.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI-Image Analytics','img_3.png',NOW(),0,1,'Analytics model timeout'),
  (gen_random_uuid(),'Gen AI-Image Analytics','img_4.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI-Image Analytics','img_5.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI-Image Analytics','img_6.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI-Image Analytics','img_7.png',NOW(),0,1,'Unsupported image format'),
  (gen_random_uuid(),'Gen AI-Image Analytics','img_8.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI-Image Analytics','img_9.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI-Image Analytics','img_10.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI-Image Analytics','img_11.png',NOW(),0,1,'Corrupt image'),
  (gen_random_uuid(),'Gen AI-Image Analytics','img_12.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI-Image Analytics','img_13.png',NOW(),1,0,NULL);

-- Gen AI - Papers to Audio — 36 rows
INSERT INTO "Gen_AI_-_Papers_to_Audio" VALUES
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_1.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_2.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_3.pdf',NOW(),0,1,'TTS model failed'),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_4.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_5.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_6.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_7.pdf',NOW(),0,1,'Audio encoding error'),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_8.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_9.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_10.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_11.pdf',NOW(),0,1,'Token limit exceeded'),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_12.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_13.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_14.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_15.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_16.pdf',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_17.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_18.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_19.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_20.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_21.pdf',NOW(),0,1,'PDF parse error'),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_22.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_23.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_24.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_25.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_26.pdf',NOW(),0,1,'Voice synthesis failed'),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_27.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_28.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_29.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_30.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_31.pdf',NOW(),0,1,'API rate limit'),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_32.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_33.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_34.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_35.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Papers to Audio','paper_36.pdf',NOW(),1,0,NULL);

-- Scientific Illustration Generator — 17 rows
INSERT INTO "Scientific_Illustration_Generator" VALUES
  (gen_random_uuid(),'Scientific Illustration Generator','fig_1.svg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Scientific Illustration Generator','fig_2.svg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Scientific Illustration Generator','fig_3.svg',NOW(),0,1,'Render failed'),
  (gen_random_uuid(),'Scientific Illustration Generator','fig_4.svg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Scientific Illustration Generator','fig_5.svg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Scientific Illustration Generator','fig_6.svg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Scientific Illustration Generator','fig_7.svg',NOW(),0,1,'Model timeout'),
  (gen_random_uuid(),'Scientific Illustration Generator','fig_8.svg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Scientific Illustration Generator','fig_9.svg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Scientific Illustration Generator','fig_10.svg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Scientific Illustration Generator','fig_11.svg',NOW(),0,1,'Invalid prompt'),
  (gen_random_uuid(),'Scientific Illustration Generator','fig_12.svg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Scientific Illustration Generator','fig_13.svg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Scientific Illustration Generator','fig_14.svg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Scientific Illustration Generator','fig_15.svg',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Scientific Illustration Generator','fig_16.svg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Scientific Illustration Generator','fig_17.svg',NOW(),1,0,NULL);

-- Gen AI - Voice audit System — 25 rows
INSERT INTO "Gen_AI_-_Voice_audit_System" VALUES
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_1.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_2.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_3.wav',NOW(),0,1,'Transcription failed'),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_4.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_5.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_6.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_7.wav',NOW(),0,1,'Noise level too high'),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_8.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_9.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_10.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_11.wav',NOW(),0,1,'Unsupported codec'),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_12.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_13.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_14.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_15.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_16.wav',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_17.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_18.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_19.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_20.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_21.wav',NOW(),0,1,'Model unavailable'),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_22.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_23.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_24.wav',NOW(),1,0,NULL),
  (gen_random_uuid(),'Gen AI - Voice audit System','audio_25.wav',NOW(),1,0,NULL);

-- GenAI Anonymization Tool — 13 rows
INSERT INTO "GenAI_Anonymization_Tool" VALUES
  (gen_random_uuid(),'GenAI Anonymization Tool','doc_1.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'GenAI Anonymization Tool','doc_2.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'GenAI Anonymization Tool','doc_3.pdf',NOW(),0,1,'PII detection failed'),
  (gen_random_uuid(),'GenAI Anonymization Tool','doc_4.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'GenAI Anonymization Tool','doc_5.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'GenAI Anonymization Tool','doc_6.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'GenAI Anonymization Tool','doc_7.pdf',NOW(),0,1,'Redaction model error'),
  (gen_random_uuid(),'GenAI Anonymization Tool','doc_8.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'GenAI Anonymization Tool','doc_9.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'GenAI Anonymization Tool','doc_10.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'GenAI Anonymization Tool','doc_11.pdf',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'GenAI Anonymization Tool','doc_12.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'GenAI Anonymization Tool','doc_13.pdf',NOW(),1,0,NULL);

-- AI Content Detector — 17 rows
INSERT INTO "AI_Content_Detector" VALUES
  (gen_random_uuid(),'AI Content Detector','article_1.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI Content Detector','article_2.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI Content Detector','article_3.txt',NOW(),0,1,'Detection model failed'),
  (gen_random_uuid(),'AI Content Detector','article_4.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI Content Detector','article_5.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI Content Detector','article_6.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI Content Detector','article_7.txt',NOW(),0,1,'Confidence score too low'),
  (gen_random_uuid(),'AI Content Detector','article_8.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI Content Detector','article_9.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI Content Detector','article_10.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI Content Detector','article_11.txt',NOW(),0,1,'Empty input'),
  (gen_random_uuid(),'AI Content Detector','article_12.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI Content Detector','article_13.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI Content Detector','article_14.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI Content Detector','article_15.txt',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'AI Content Detector','article_16.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI Content Detector','article_17.txt',NOW(),1,0,NULL);

-- TandF Rubriq proessing — 36 rows
INSERT INTO "TandF_Rubriq_proessing" VALUES
  (gen_random_uuid(),'TandF Rubriq proessing','submission_1.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_2.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_3.pdf',NOW(),0,1,'Rubriq API error'),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_4.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_5.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_6.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_7.pdf',NOW(),0,1,'Score parse failed'),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_8.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_9.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_10.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_11.pdf',NOW(),0,1,'Token limit exceeded'),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_12.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_13.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_14.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_15.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_16.pdf',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_17.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_18.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_19.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_20.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_21.pdf',NOW(),0,1,'Duplicate entry'),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_22.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_23.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_24.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_25.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_26.pdf',NOW(),0,1,'API rate limit'),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_27.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_28.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_29.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_30.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_31.pdf',NOW(),0,1,'Malformed response'),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_32.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_33.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_34.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_35.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF Rubriq proessing','submission_36.pdf',NOW(),1,0,NULL);

-- TandF LAT Score for tracks — 25 rows
INSERT INTO "TandF_LAT_Score_for_tracks" VALUES
  (gen_random_uuid(),'TandF LAT Score for tracks','track_1.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_2.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_3.csv',NOW(),0,1,'Score computation failed'),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_4.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_5.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_6.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_7.csv',NOW(),0,1,'Missing track metadata'),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_8.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_9.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_10.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_11.csv',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_12.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_13.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_14.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_15.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_16.csv',NOW(),0,1,'API error'),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_17.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_18.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_19.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_20.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_21.csv',NOW(),0,1,'Duplicate track'),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_22.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_23.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_24.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'TandF LAT Score for tracks','track_25.csv',NOW(),1,0,NULL);
