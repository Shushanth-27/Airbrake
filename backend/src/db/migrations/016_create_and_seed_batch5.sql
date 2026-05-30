-- Migration 016: Create and seed batch 5 (15 projects)

CREATE TABLE IF NOT EXISTS "Bibliography_Structuring" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Bibliography Structuring',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Story_board_creation" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Story board creation',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Edit_Optimization" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Edit Optimization',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "JSON_Translation" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'JSON Translation',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "HTML_Conversion" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'HTML Conversion',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "eMFC_XML_Rule_Report_Generation" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'eMFC XML Rule Report Generation',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "TOC_Extractor" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'TOC Extractor',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "MultiModal_Alt_Text" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'MultiModal Alt Text',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Docx_Alt_text_Generation" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Docx Alt text Generation',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "DEI_Image_Check" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'DEI Image Check',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Peer_Reviewer_Finding" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Peer Reviewer Finding',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Language_Translation(D)" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Language Translation(D)',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Indexing" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Indexing',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Database_Chat_(Text2SQL)" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Database Chat (Text2SQL)',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "XML(QC)" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'XML(QC)',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);

-- Bibliography Structuring — 30 rows
INSERT INTO "Bibliography_Structuring" VALUES
  (gen_random_uuid(),'Bibliography Structuring','ref_1.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_2.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_3.docx',NOW(),0,1,'Author field missing'),
  (gen_random_uuid(),'Bibliography Structuring','ref_4.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_5.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_6.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_7.docx',NOW(),0,1,'Year not detected'),
  (gen_random_uuid(),'Bibliography Structuring','ref_8.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_9.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_10.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_11.docx',NOW(),0,1,'DOI parse error'),
  (gen_random_uuid(),'Bibliography Structuring','ref_12.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_13.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_14.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_15.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_16.docx',NOW(),0,1,'Duplicate reference'),
  (gen_random_uuid(),'Bibliography Structuring','ref_17.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_18.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_19.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_20.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_21.docx',NOW(),0,1,'Malformed citation'),
  (gen_random_uuid(),'Bibliography Structuring','ref_22.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_23.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_24.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_25.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_26.docx',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Bibliography Structuring','ref_27.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_28.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_29.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Bibliography Structuring','ref_30.docx',NOW(),1,0,NULL);

-- Story board creation — 7 rows
INSERT INTO "Story_board_creation" VALUES
  (gen_random_uuid(),'Story board creation','board_1.pptx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Story board creation','board_2.pptx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Story board creation','board_3.pptx',NOW(),0,1,'Slide generation failed'),
  (gen_random_uuid(),'Story board creation','board_4.pptx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Story board creation','board_5.pptx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Story board creation','board_6.pptx',NOW(),0,1,'Image asset missing'),
  (gen_random_uuid(),'Story board creation','board_7.pptx',NOW(),1,0,NULL);

-- Edit Optimization — 25 rows
INSERT INTO "Edit_Optimization" VALUES
  (gen_random_uuid(),'Edit Optimization','doc_1.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_2.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_3.docx',NOW(),0,1,'Suggestion model timeout'),
  (gen_random_uuid(),'Edit Optimization','doc_4.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_5.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_6.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_7.docx',NOW(),0,1,'Empty diff result'),
  (gen_random_uuid(),'Edit Optimization','doc_8.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_9.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_10.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_11.docx',NOW(),0,1,'Token limit exceeded'),
  (gen_random_uuid(),'Edit Optimization','doc_12.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_13.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_14.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_15.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_16.docx',NOW(),0,1,'LLM response malformed'),
  (gen_random_uuid(),'Edit Optimization','doc_17.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_18.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_19.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_20.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_21.docx',NOW(),0,1,'Encoding error'),
  (gen_random_uuid(),'Edit Optimization','doc_22.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_23.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_24.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Edit Optimization','doc_25.docx',NOW(),1,0,NULL);

-- JSON Translation — 16 rows
INSERT INTO "JSON_Translation" VALUES
  (gen_random_uuid(),'JSON Translation','payload_1.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'JSON Translation','payload_2.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'JSON Translation','payload_3.json',NOW(),0,1,'Key mapping failed'),
  (gen_random_uuid(),'JSON Translation','payload_4.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'JSON Translation','payload_5.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'JSON Translation','payload_6.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'JSON Translation','payload_7.json',NOW(),0,1,'Invalid JSON structure'),
  (gen_random_uuid(),'JSON Translation','payload_8.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'JSON Translation','payload_9.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'JSON Translation','payload_10.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'JSON Translation','payload_11.json',NOW(),0,1,'Unsupported locale'),
  (gen_random_uuid(),'JSON Translation','payload_12.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'JSON Translation','payload_13.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'JSON Translation','payload_14.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'JSON Translation','payload_15.json',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'JSON Translation','payload_16.json',NOW(),1,0,NULL);

-- HTML Conversion — 30 rows
INSERT INTO "HTML_Conversion" VALUES
  (gen_random_uuid(),'HTML Conversion','page_1.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_2.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_3.html',NOW(),0,1,'CSS parse error'),
  (gen_random_uuid(),'HTML Conversion','page_4.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_5.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_6.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_7.html',NOW(),0,1,'Broken link detected'),
  (gen_random_uuid(),'HTML Conversion','page_8.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_9.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_10.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_11.html',NOW(),0,1,'Encoding mismatch'),
  (gen_random_uuid(),'HTML Conversion','page_12.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_13.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_14.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_15.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_16.html',NOW(),0,1,'Missing doctype'),
  (gen_random_uuid(),'HTML Conversion','page_17.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_18.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_19.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_20.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_21.html',NOW(),0,1,'Script injection blocked'),
  (gen_random_uuid(),'HTML Conversion','page_22.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_23.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_24.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_25.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_26.html',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'HTML Conversion','page_27.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_28.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_29.html',NOW(),1,0,NULL),
  (gen_random_uuid(),'HTML Conversion','page_30.html',NOW(),1,0,NULL);

-- eMFC XML Rule Report Generation — 25 rows
INSERT INTO "eMFC_XML_Rule_Report_Generation" VALUES
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_1.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_2.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_3.xml',NOW(),0,1,'Rule validation failed'),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_4.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_5.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_6.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_7.xml',NOW(),0,1,'Schema not found'),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_8.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_9.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_10.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_11.xml',NOW(),0,1,'Namespace conflict'),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_12.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_13.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_14.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_15.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_16.xml',NOW(),0,1,'Report template missing'),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_17.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_18.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_19.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_20.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_21.xml',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_22.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_23.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_24.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'eMFC XML Rule Report Generation','rule_25.xml',NOW(),1,0,NULL);

-- TOC Extractor — 16 rows
INSERT INTO "TOC_Extractor" VALUES
  (gen_random_uuid(),'TOC Extractor','book_1.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TOC Extractor','book_2.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TOC Extractor','book_3.pdf',NOW(),0,1,'TOC not found'),
  (gen_random_uuid(),'TOC Extractor','book_4.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TOC Extractor','book_5.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TOC Extractor','book_6.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TOC Extractor','book_7.pdf',NOW(),0,1,'Page number mismatch'),
  (gen_random_uuid(),'TOC Extractor','book_8.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TOC Extractor','book_9.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TOC Extractor','book_10.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TOC Extractor','book_11.pdf',NOW(),0,1,'Corrupt PDF'),
  (gen_random_uuid(),'TOC Extractor','book_12.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TOC Extractor','book_13.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TOC Extractor','book_14.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'TOC Extractor','book_15.pdf',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'TOC Extractor','book_16.pdf',NOW(),1,0,NULL);

-- MultiModal Alt Text — 25 rows
INSERT INTO "MultiModal_Alt_Text" VALUES
  (gen_random_uuid(),'MultiModal Alt Text','img_1.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_2.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_3.png',NOW(),0,1,'Vision model timeout'),
  (gen_random_uuid(),'MultiModal Alt Text','img_4.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_5.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_6.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_7.png',NOW(),0,1,'Alt text too short'),
  (gen_random_uuid(),'MultiModal Alt Text','img_8.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_9.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_10.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_11.png',NOW(),0,1,'Unsupported image format'),
  (gen_random_uuid(),'MultiModal Alt Text','img_12.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_13.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_14.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_15.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_16.png',NOW(),0,1,'Model confidence low'),
  (gen_random_uuid(),'MultiModal Alt Text','img_17.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_18.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_19.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_20.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_21.png',NOW(),0,1,'Corrupt image'),
  (gen_random_uuid(),'MultiModal Alt Text','img_22.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_23.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_24.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'MultiModal Alt Text','img_25.png',NOW(),1,0,NULL);

-- Docx Alt text Generation — 7 rows
INSERT INTO "Docx_Alt_text_Generation" VALUES
  (gen_random_uuid(),'Docx Alt text Generation','doc_1.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Docx Alt text Generation','doc_2.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Docx Alt text Generation','doc_3.docx',NOW(),0,1,'Image extraction failed'),
  (gen_random_uuid(),'Docx Alt text Generation','doc_4.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Docx Alt text Generation','doc_5.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Docx Alt text Generation','doc_6.docx',NOW(),0,1,'Alt text generation timeout'),
  (gen_random_uuid(),'Docx Alt text Generation','doc_7.docx',NOW(),1,0,NULL);

-- DEI Image Check — 16 rows
INSERT INTO "DEI_Image_Check" VALUES
  (gen_random_uuid(),'DEI Image Check','img_1.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'DEI Image Check','img_2.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'DEI Image Check','img_3.jpg',NOW(),0,1,'Bias detection failed'),
  (gen_random_uuid(),'DEI Image Check','img_4.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'DEI Image Check','img_5.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'DEI Image Check','img_6.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'DEI Image Check','img_7.jpg',NOW(),0,1,'Model unavailable'),
  (gen_random_uuid(),'DEI Image Check','img_8.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'DEI Image Check','img_9.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'DEI Image Check','img_10.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'DEI Image Check','img_11.jpg',NOW(),0,1,'Low resolution image'),
  (gen_random_uuid(),'DEI Image Check','img_12.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'DEI Image Check','img_13.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'DEI Image Check','img_14.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'DEI Image Check','img_15.jpg',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'DEI Image Check','img_16.jpg',NOW(),1,0,NULL);

-- Peer Reviewer Finding — 30 rows
INSERT INTO "Peer_Reviewer_Finding" VALUES
  (gen_random_uuid(),'Peer Reviewer Finding','paper_1.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_2.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_3.pdf',NOW(),0,1,'No reviewers found'),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_4.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_5.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_6.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_7.pdf',NOW(),0,1,'API rate limit'),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_8.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_9.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_10.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_11.pdf',NOW(),0,1,'Keyword extraction failed'),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_12.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_13.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_14.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_15.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_16.pdf',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_17.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_18.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_19.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_20.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_21.pdf',NOW(),0,1,'Duplicate submission'),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_22.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_23.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_24.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_25.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_26.pdf',NOW(),0,1,'LLM response empty'),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_27.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_28.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_29.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Peer Reviewer Finding','paper_30.pdf',NOW(),1,0,NULL);

-- Language Translation(D) — 25 rows
INSERT INTO "Language_Translation(D)" VALUES
  (gen_random_uuid(),'Language Translation(D)','doc_1.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_2.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_3.idml',NOW(),0,1,'Dialect not supported'),
  (gen_random_uuid(),'Language Translation(D)','doc_4.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_5.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_6.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_7.idml',NOW(),0,1,'Token limit exceeded'),
  (gen_random_uuid(),'Language Translation(D)','doc_8.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_9.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_10.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_11.idml',NOW(),0,1,'Encoding mismatch'),
  (gen_random_uuid(),'Language Translation(D)','doc_12.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_13.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_14.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_15.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_16.idml',NOW(),0,1,'Missing source text'),
  (gen_random_uuid(),'Language Translation(D)','doc_17.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_18.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_19.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_20.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_21.idml',NOW(),0,1,'API rate limit'),
  (gen_random_uuid(),'Language Translation(D)','doc_22.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_23.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_24.idml',NOW(),1,0,NULL),
  (gen_random_uuid(),'Language Translation(D)','doc_25.idml',NOW(),1,0,NULL);

-- Indexing — 7 rows
INSERT INTO "Indexing" VALUES
  (gen_random_uuid(),'Indexing','book_1.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Indexing','book_2.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Indexing','book_3.pdf',NOW(),0,1,'Index build failed'),
  (gen_random_uuid(),'Indexing','book_4.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Indexing','book_5.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Indexing','book_6.pdf',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Indexing','book_7.pdf',NOW(),1,0,NULL);

-- Database Chat (Text2SQL) — 16 rows
INSERT INTO "Database_Chat_(Text2SQL)" VALUES
  (gen_random_uuid(),'Database Chat (Text2SQL)','query_1.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Database Chat (Text2SQL)','query_2.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Database Chat (Text2SQL)','query_3.txt',NOW(),0,1,'SQL generation failed'),
  (gen_random_uuid(),'Database Chat (Text2SQL)','query_4.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Database Chat (Text2SQL)','query_5.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Database Chat (Text2SQL)','query_6.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Database Chat (Text2SQL)','query_7.txt',NOW(),0,1,'Schema not loaded'),
  (gen_random_uuid(),'Database Chat (Text2SQL)','query_8.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Database Chat (Text2SQL)','query_9.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Database Chat (Text2SQL)','query_10.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Database Chat (Text2SQL)','query_11.txt',NOW(),0,1,'Ambiguous column reference'),
  (gen_random_uuid(),'Database Chat (Text2SQL)','query_12.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Database Chat (Text2SQL)','query_13.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Database Chat (Text2SQL)','query_14.txt',NOW(),1,0,NULL),
  (gen_random_uuid(),'Database Chat (Text2SQL)','query_15.txt',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Database Chat (Text2SQL)','query_16.txt',NOW(),1,0,NULL);

-- XML(QC) — 30 rows
INSERT INTO "XML(QC)" VALUES
  (gen_random_uuid(),'XML(QC)','xml_1.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_2.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_3.xml',NOW(),0,1,'Schema validation failed'),
  (gen_random_uuid(),'XML(QC)','xml_4.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_5.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_6.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_7.xml',NOW(),0,1,'Malformed XML'),
  (gen_random_uuid(),'XML(QC)','xml_8.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_9.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_10.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_11.xml',NOW(),0,1,'Namespace error'),
  (gen_random_uuid(),'XML(QC)','xml_12.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_13.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_14.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_15.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_16.xml',NOW(),0,1,'Tag mismatch'),
  (gen_random_uuid(),'XML(QC)','xml_17.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_18.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_19.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_20.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_21.xml',NOW(),0,1,'Encoding issue'),
  (gen_random_uuid(),'XML(QC)','xml_22.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_23.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_24.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_25.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_26.xml',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'XML(QC)','xml_27.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_28.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_29.xml',NOW(),1,0,NULL),
  (gen_random_uuid(),'XML(QC)','xml_30.xml',NOW(),1,0,NULL);
