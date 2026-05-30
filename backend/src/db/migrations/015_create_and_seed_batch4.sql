-- Migration 015: Create and seed batch 4 (15 projects)

CREATE TABLE IF NOT EXISTS "Image_generator" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Image generator',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Language_Translation" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Language Translation',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Taxonomy" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Taxonomy',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Email_Sentiment_Analysis" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Email Sentiment Analysis',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Chatbot_response_labelling" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Chatbot response labelling',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "XML_Heading_Hierarchy" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'XML Heading Hierarchy',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "XML_Element_Prediction" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'XML Element Prediction',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Grammar_Check_(C&G)" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Grammar Check (C&G)',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Grammar_Check_(C&G)_-_Word" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Grammar Check (C&G) - Word',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Grammar_Check_(C&G)_-_XML" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Grammar Check (C&G) - XML',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Edition_Evolution_Analyzer" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Edition Evolution Analyzer',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Knowledge_Graph" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Knowledge_Graph',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "AI_XML_Processing" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'AI XML Processing',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "FM_Structuring" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'FM Structuring',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);

-- Image generator — 8 rows
INSERT INTO "Image_generator" VALUES
  (gen_random_uuid(),'Image generator','prompt_1.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image generator','prompt_2.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image generator','prompt_3.txt',NOW(),0,1,'Model timeout'),
  (gen_random_uuid(),'Image generator','prompt_4.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image generator','prompt_5.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image generator','prompt_6.txt',NOW(),0,1,'Invalid prompt format'),
  (gen_random_uuid(),'Image generator','prompt_7.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image generator','prompt_8.txt',NOW(),1,0,NULL);

-- Language Translation — 28 rows
INSERT INTO "Language_Translation" VALUES
  (gen_random_uuid(),'Language Translation','doc_1.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_2.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_3.idml',NOW(),0,1,'Unsupported language pair'),
  (gen_random_uuid(),'Language Translation','doc_4.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_5.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_6.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_7.idml',NOW(),0,1,'Token limit exceeded'),
  (gen_random_uuid(),'Language Translation','doc_8.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_9.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_10.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_11.idml',NOW(),0,1,'Encoding mismatch'),
  (gen_random_uuid(),'Language Translation','doc_12.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_13.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_14.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_15.idml',NOW(),0,1,'Missing source text'),
  (gen_random_uuid(),'Language Translation','doc_16.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_17.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_18.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_19.idml',NOW(),0,1,'API rate limit'),
  (gen_random_uuid(),'Language Translation','doc_20.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_21.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_22.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_23.idml',NOW(),0,1,'Null segment'),
  (gen_random_uuid(),'Language Translation','doc_24.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_25.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_26.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation','doc_27.idml',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Language Translation','doc_28.idml',NOW(),1,0,NULL);

-- Taxonomy — 10 rows
INSERT INTO "Taxonomy" VALUES
  (gen_random_uuid(),'Taxonomy','paper_1.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Taxonomy','paper_2.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Taxonomy','paper_3.pdf',NOW(),0,1,'Topic extraction failed'),
  (gen_random_uuid(),'Taxonomy','paper_4.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Taxonomy','paper_5.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Taxonomy','paper_6.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Taxonomy','paper_7.pdf',NOW(),0,1,'LLM response malformed'),
  (gen_random_uuid(),'Taxonomy','paper_8.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Taxonomy','paper_9.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Taxonomy','paper_10.pdf',NOW(),1,0,NULL);

-- Email Sentiment Analysis — 8 rows
INSERT INTO "Email_Sentiment_Analysis" VALUES
  (gen_random_uuid(),'Email Sentiment Analysis','email_1.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Email Sentiment Analysis','email_2.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Email Sentiment Analysis','email_3.txt',NOW(),0,1,'Sentiment model unavailable'),
  (gen_random_uuid(),'Email Sentiment Analysis','email_4.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Email Sentiment Analysis','email_5.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Email Sentiment Analysis','email_6.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Email Sentiment Analysis','email_7.txt',NOW(),0,1,'Empty input'),
  (gen_random_uuid(),'Email Sentiment Analysis','email_8.txt',NOW(),1,0,NULL);

-- Chatbot response labelling — 15 rows
INSERT INTO "Chatbot_response_labelling" VALUES
  (gen_random_uuid(),'Chatbot response labelling','resp_1.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot response labelling','resp_2.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot response labelling','resp_3.csv',NOW(),0,1,'Label schema mismatch'),
  (gen_random_uuid(),'Chatbot response labelling','resp_4.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot response labelling','resp_5.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot response labelling','resp_6.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot response labelling','resp_7.csv',NOW(),0,1,'Duplicate entry'),
  (gen_random_uuid(),'Chatbot response labelling','resp_8.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot response labelling','resp_9.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot response labelling','resp_10.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot response labelling','resp_11.csv',NOW(),0,1,'Timestamp format error'),
  (gen_random_uuid(),'Chatbot response labelling','resp_12.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot response labelling','resp_13.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot response labelling','resp_14.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Chatbot response labelling','resp_15.csv',NOW(),1,0,NULL);

-- XML Heading Hierarchy — 10 rows
INSERT INTO "XML_Heading_Hierarchy" VALUES
  (gen_random_uuid(),'XML Heading Hierarchy','xml_1.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Heading Hierarchy','xml_2.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Heading Hierarchy','xml_3.xml',NOW(),0,1,'Heading level mismatch'),
  (gen_random_uuid(),'XML Heading Hierarchy','xml_4.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Heading Hierarchy','xml_5.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Heading Hierarchy','xml_6.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Heading Hierarchy','xml_7.xml',NOW(),0,1,'Malformed XML'),
  (gen_random_uuid(),'XML Heading Hierarchy','xml_8.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Heading Hierarchy','xml_9.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Heading Hierarchy','xml_10.xml',NOW(),1,0,NULL);

-- XML Element Prediction — 15 rows
INSERT INTO "XML_Element_Prediction" VALUES
  (gen_random_uuid(),'XML Element Prediction','word_1.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Element Prediction','word_2.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Element Prediction','word_3.docx',NOW(),0,1,'Tag prediction failed'),
  (gen_random_uuid(),'XML Element Prediction','word_4.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Element Prediction','word_5.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Element Prediction','word_6.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Element Prediction','word_7.docx',NOW(),0,1,'Model confidence low'),
  (gen_random_uuid(),'XML Element Prediction','word_8.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Element Prediction','word_9.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Element Prediction','word_10.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Element Prediction','word_11.docx',NOW(),0,1,'Unknown element type'),
  (gen_random_uuid(),'XML Element Prediction','word_12.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Element Prediction','word_13.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Element Prediction','word_14.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML Element Prediction','word_15.docx',NOW(),1,0,NULL);

-- Grammar Check (C&G) — 8 rows
INSERT INTO "Grammar_Check_(C&G)" VALUES
  (gen_random_uuid(),'Grammar Check (C&G)','text_1.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G)','text_2.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G)','text_3.txt',NOW(),0,1,'Bedrock API error'),
  (gen_random_uuid(),'Grammar Check (C&G)','text_4.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G)','text_5.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G)','text_6.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G)','text_7.txt',NOW(),0,1,'Empty response'),
  (gen_random_uuid(),'Grammar Check (C&G)','text_8.txt',NOW(),1,0,NULL);

-- Grammar Check (C&G) - Word — 10 rows
INSERT INTO "Grammar_Check_(C&G)_-_Word" VALUES
  (gen_random_uuid(),'Grammar Check (C&G) - Word','doc_1.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G) - Word','doc_2.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G) - Word','doc_3.docx',NOW(),0,1,'Formatting lost'),
  (gen_random_uuid(),'Grammar Check (C&G) - Word','doc_4.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G) - Word','doc_5.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G) - Word','doc_6.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G) - Word','doc_7.docx',NOW(),0,1,'Parse error'),
  (gen_random_uuid(),'Grammar Check (C&G) - Word','doc_8.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G) - Word','doc_9.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G) - Word','doc_10.docx',NOW(),1,0,NULL);

-- Grammar Check (C&G) - XML — 10 rows
INSERT INTO "Grammar_Check_(C&G)_-_XML" VALUES
  (gen_random_uuid(),'Grammar Check (C&G) - XML','xml_1.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G) - XML','xml_2.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G) - XML','xml_3.xml',NOW(),0,1,'Tag structure broken'),
  (gen_random_uuid(),'Grammar Check (C&G) - XML','xml_4.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G) - XML','xml_5.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G) - XML','xml_6.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G) - XML','xml_7.xml',NOW(),0,1,'Namespace conflict'),
  (gen_random_uuid(),'Grammar Check (C&G) - XML','xml_8.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G) - XML','xml_9.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Grammar Check (C&G) - XML','xml_10.xml',NOW(),1,0,NULL);

-- Edition Evolution Analyzer — 15 rows
INSERT INTO "Edition_Evolution_Analyzer" VALUES
  (gen_random_uuid(),'Edition Evolution Analyzer','ed_1.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edition Evolution Analyzer','ed_2.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edition Evolution Analyzer','ed_3.xml',NOW(),0,1,'Diff computation failed'),
  (gen_random_uuid(),'Edition Evolution Analyzer','ed_4.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edition Evolution Analyzer','ed_5.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edition Evolution Analyzer','ed_6.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edition Evolution Analyzer','ed_7.xml',NOW(),0,1,'Version mismatch'),
  (gen_random_uuid(),'Edition Evolution Analyzer','ed_8.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edition Evolution Analyzer','ed_9.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edition Evolution Analyzer','ed_10.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edition Evolution Analyzer','ed_11.xml',NOW(),0,1,'Markup conflict'),
  (gen_random_uuid(),'Edition Evolution Analyzer','ed_12.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edition Evolution Analyzer','ed_13.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edition Evolution Analyzer','ed_14.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edition Evolution Analyzer','ed_15.xml',NOW(),1,0,NULL);

-- Knowledge_Graph — 8 rows
INSERT INTO "Knowledge_Graph" VALUES
  (gen_random_uuid(),'Knowledge_Graph','graph_1.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Knowledge_Graph','graph_2.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Knowledge_Graph','graph_3.txt',NOW(),0,1,'Entity extraction failed'),
  (gen_random_uuid(),'Knowledge_Graph','graph_4.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Knowledge_Graph','graph_5.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Knowledge_Graph','graph_6.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Knowledge_Graph','graph_7.txt',NOW(),0,1,'Graph render error'),
  (gen_random_uuid(),'Knowledge_Graph','graph_8.txt',NOW(),1,0,NULL);

-- AI XML Processing — 28 rows
INSERT INTO "AI_XML_Processing" VALUES
  (gen_random_uuid(),'AI XML Processing','xml_1.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_2.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_3.xml',NOW(),0,1,'Tag validation failed'),
  (gen_random_uuid(),'AI XML Processing','xml_4.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_5.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_6.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_7.xml',NOW(),0,1,'Schema mismatch'),
  (gen_random_uuid(),'AI XML Processing','xml_8.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_9.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_10.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_11.xml',NOW(),0,1,'Malformed input'),
  (gen_random_uuid(),'AI XML Processing','xml_12.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_13.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_14.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_15.xml',NOW(),0,1,'Namespace error'),
  (gen_random_uuid(),'AI XML Processing','xml_16.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_17.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_18.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_19.xml',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'AI XML Processing','xml_20.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_21.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_22.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_23.xml',NOW(),0,1,'Empty element'),
  (gen_random_uuid(),'AI XML Processing','xml_24.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_25.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_26.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI XML Processing','xml_27.xml',NOW(),0,1,'Encoding issue'),
  (gen_random_uuid(),'AI XML Processing','xml_28.xml',NOW(),1,0,NULL);

-- FM Structuring — 10 rows
INSERT INTO "FM_Structuring" VALUES
  (gen_random_uuid(),'FM Structuring','ref_1.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'FM Structuring','ref_2.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'FM Structuring','ref_3.docx',NOW(),0,1,'Author field missing'),
  (gen_random_uuid(),'FM Structuring','ref_4.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'FM Structuring','ref_5.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'FM Structuring','ref_6.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'FM Structuring','ref_7.docx',NOW(),0,1,'Year not detected'),
  (gen_random_uuid(),'FM Structuring','ref_8.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'FM Structuring','ref_9.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'FM Structuring','ref_10.docx',NOW(),1,0,NULL);
