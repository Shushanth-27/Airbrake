-- Migration 017: Create and seed batch 6 (10 projects)

CREATE TABLE IF NOT EXISTS "Image_processing_Dashboard" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Image processing Dashboard',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Element_Prediction_Dashboard" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Element Prediction Dashboard',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Alt_Text_Dashboard_(M1)" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Alt Text Dashboard (M1)',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "ALT_TEXT_DASHBOARD_(E)" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'ALT TEXT DASHBOARD (E)',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Alt-Text_Dashboard_(M2)" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Alt-Text Dashboard (M2)',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Lewis_A/B_Testing" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Lewis A/B Testing',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Data_Labelling_Dashboard" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Data Labelling Dashboard',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Lewis_Review_Dashboard" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Lewis Review Dashboard',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Classification_Accuracy_Dashboard" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Classification Accuracy Dashboard',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS "Classification_(T)" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_name TEXT NOT NULL DEFAULT 'Classification (T)',
  file_name TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0, error TEXT
);

-- Image processing Dashboard — 35 rows
INSERT INTO "Image_processing_Dashboard" VALUES
  (gen_random_uuid(),'Image processing Dashboard','img_1.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_2.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_3.png',NOW(),0,1,'Resize failed'),
  (gen_random_uuid(),'Image processing Dashboard','img_4.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_5.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_6.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_7.png',NOW(),0,1,'Blur detection failed'),
  (gen_random_uuid(),'Image processing Dashboard','img_8.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_9.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_10.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_11.png',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Image processing Dashboard','img_12.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_13.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_14.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_15.png',NOW(),0,1,'Filter failed'),
  (gen_random_uuid(),'Image processing Dashboard','img_16.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_17.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_18.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_19.png',NOW(),0,1,'OCR mismatch'),
  (gen_random_uuid(),'Image processing Dashboard','img_20.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_21.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_22.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_23.png',NOW(),0,1,'Corrupt image'),
  (gen_random_uuid(),'Image processing Dashboard','img_24.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_25.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_26.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_27.png',NOW(),0,1,'Segmentation failed'),
  (gen_random_uuid(),'Image processing Dashboard','img_28.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_29.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_30.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_31.png',NOW(),0,1,'Model unavailable'),
  (gen_random_uuid(),'Image processing Dashboard','img_32.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_33.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_34.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image processing Dashboard','img_35.png',NOW(),1,0,NULL);

-- Element Prediction Dashboard — 27 rows
INSERT INTO "Element_Prediction_Dashboard" VALUES
  (gen_random_uuid(),'Element Prediction Dashboard','word_1.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_2.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_3.docx',NOW(),0,1,'Tag prediction failed'),
  (gen_random_uuid(),'Element Prediction Dashboard','word_4.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_5.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_6.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_7.docx',NOW(),0,1,'Model confidence low'),
  (gen_random_uuid(),'Element Prediction Dashboard','word_8.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_9.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_10.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_11.docx',NOW(),0,1,'Unknown element type'),
  (gen_random_uuid(),'Element Prediction Dashboard','word_12.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_13.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_14.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_15.docx',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Element Prediction Dashboard','word_16.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_17.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_18.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_19.docx',NOW(),0,1,'Schema mismatch'),
  (gen_random_uuid(),'Element Prediction Dashboard','word_20.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_21.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_22.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_23.docx',NOW(),0,1,'Empty response'),
  (gen_random_uuid(),'Element Prediction Dashboard','word_24.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_25.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_26.docx',NOW(),1,0,NULL),
  (gen_random_uuid(),'Element Prediction Dashboard','word_27.docx',NOW(),1,0,NULL);

-- Alt Text Dashboard (M1) — 30 rows
INSERT INTO "Alt_Text_Dashboard_(M1)" VALUES
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_1.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_2.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_3.png',NOW(),0,1,'Vision model timeout'),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_4.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_5.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_6.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_7.png',NOW(),0,1,'Alt text too short'),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_8.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_9.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_10.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_11.png',NOW(),0,1,'Unsupported format'),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_12.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_13.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_14.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_15.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_16.png',NOW(),0,1,'Model confidence low'),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_17.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_18.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_19.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_20.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_21.png',NOW(),0,1,'Corrupt image'),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_22.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_23.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_24.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_25.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_26.png',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_27.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_28.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_29.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt Text Dashboard (M1)','img_30.png',NOW(),1,0,NULL);

-- ALT TEXT DASHBOARD (E) — 12 rows
INSERT INTO "ALT_TEXT_DASHBOARD_(E)" VALUES
  (gen_random_uuid(),'ALT TEXT DASHBOARD (E)','img_1.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'ALT TEXT DASHBOARD (E)','img_2.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'ALT TEXT DASHBOARD (E)','img_3.jpg',NOW(),0,1,'Alt text generation failed'),
  (gen_random_uuid(),'ALT TEXT DASHBOARD (E)','img_4.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'ALT TEXT DASHBOARD (E)','img_5.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'ALT TEXT DASHBOARD (E)','img_6.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'ALT TEXT DASHBOARD (E)','img_7.jpg',NOW(),0,1,'Model unavailable'),
  (gen_random_uuid(),'ALT TEXT DASHBOARD (E)','img_8.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'ALT TEXT DASHBOARD (E)','img_9.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'ALT TEXT DASHBOARD (E)','img_10.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'ALT TEXT DASHBOARD (E)','img_11.jpg',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'ALT TEXT DASHBOARD (E)','img_12.jpg',NOW(),1,0,NULL);

-- Alt-Text Dashboard (M2) — 35 rows
INSERT INTO "Alt-Text_Dashboard_(M2)" VALUES
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_1.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_2.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_3.png',NOW(),0,1,'Vision model timeout'),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_4.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_5.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_6.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_7.png',NOW(),0,1,'Low resolution'),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_8.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_9.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_10.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_11.png',NOW(),0,1,'Unsupported format'),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_12.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_13.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_14.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_15.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_16.png',NOW(),0,1,'Model confidence low'),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_17.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_18.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_19.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_20.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_21.png',NOW(),0,1,'Corrupt image'),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_22.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_23.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_24.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_25.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_26.png',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_27.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_28.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_29.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_30.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_31.png',NOW(),0,1,'Empty response'),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_32.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_33.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_34.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Alt-Text Dashboard (M2)','img_35.png',NOW(),1,0,NULL);

-- Lewis A/B Testing — 27 rows
INSERT INTO "Lewis_A/B_Testing" VALUES
  (gen_random_uuid(),'Lewis A/B Testing','test_1.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_2.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_3.csv',NOW(),0,1,'Variant assignment failed'),
  (gen_random_uuid(),'Lewis A/B Testing','test_4.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_5.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_6.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_7.csv',NOW(),0,1,'Statistical model error'),
  (gen_random_uuid(),'Lewis A/B Testing','test_8.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_9.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_10.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_11.csv',NOW(),0,1,'Insufficient sample size'),
  (gen_random_uuid(),'Lewis A/B Testing','test_12.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_13.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_14.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_15.csv',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Lewis A/B Testing','test_16.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_17.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_18.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_19.csv',NOW(),0,1,'Duplicate entry'),
  (gen_random_uuid(),'Lewis A/B Testing','test_20.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_21.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_22.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_23.csv',NOW(),0,1,'Config parse error'),
  (gen_random_uuid(),'Lewis A/B Testing','test_24.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_25.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_26.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis A/B Testing','test_27.csv',NOW(),1,0,NULL);

-- Data Labelling Dashboard — 30 rows
INSERT INTO "Data_Labelling_Dashboard" VALUES
  (gen_random_uuid(),'Data Labelling Dashboard','batch_1.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_2.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_3.csv',NOW(),0,1,'Label schema mismatch'),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_4.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_5.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_6.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_7.csv',NOW(),0,1,'Duplicate entry'),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_8.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_9.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_10.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_11.csv',NOW(),0,1,'Missing annotation'),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_12.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_13.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_14.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_15.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_16.csv',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_17.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_18.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_19.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_20.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_21.csv',NOW(),0,1,'Invalid label value'),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_22.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_23.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_24.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_25.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_26.csv',NOW(),0,1,'File corrupt'),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_27.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_28.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_29.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Data Labelling Dashboard','batch_30.csv',NOW(),1,0,NULL);

-- Lewis Review Dashboard — 12 rows
INSERT INTO "Lewis_Review_Dashboard" VALUES
  (gen_random_uuid(),'Lewis Review Dashboard','review_1.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis Review Dashboard','review_2.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis Review Dashboard','review_3.pdf',NOW(),0,1,'Review parse failed'),
  (gen_random_uuid(),'Lewis Review Dashboard','review_4.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis Review Dashboard','review_5.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis Review Dashboard','review_6.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis Review Dashboard','review_7.pdf',NOW(),0,1,'Scoring model error'),
  (gen_random_uuid(),'Lewis Review Dashboard','review_8.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis Review Dashboard','review_9.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis Review Dashboard','review_10.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'Lewis Review Dashboard','review_11.pdf',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Lewis Review Dashboard','review_12.pdf',NOW(),1,0,NULL);

-- Classification Accuracy Dashboard — 35 rows
INSERT INTO "Classification_Accuracy_Dashboard" VALUES
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_1.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_2.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_3.csv',NOW(),0,1,'Class imbalance error'),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_4.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_5.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_6.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_7.csv',NOW(),0,1,'Model not loaded'),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_8.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_9.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_10.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_11.csv',NOW(),0,1,'Prediction timeout'),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_12.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_13.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_14.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_15.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_16.csv',NOW(),0,1,'Feature extraction failed'),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_17.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_18.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_19.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_20.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_21.csv',NOW(),0,1,'Null label'),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_22.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_23.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_24.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_25.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_26.csv',NOW(),0,1,'Encoding error'),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_27.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_28.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_29.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_30.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_31.csv',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_32.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_33.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_34.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification Accuracy Dashboard','data_35.csv',NOW(),1,0,NULL);

-- Classification (T) — 27 rows
INSERT INTO "Classification_(T)" VALUES
  (gen_random_uuid(),'Classification (T)','data_1.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_2.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_3.csv',NOW(),0,1,'Label mismatch'),
  (gen_random_uuid(),'Classification (T)','data_4.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_5.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_6.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_7.csv',NOW(),0,1,'Model not loaded'),
  (gen_random_uuid(),'Classification (T)','data_8.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_9.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_10.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_11.csv',NOW(),0,1,'Timeout'),
  (gen_random_uuid(),'Classification (T)','data_12.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_13.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_14.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_15.csv',NOW(),0,1,'Feature extraction failed'),
  (gen_random_uuid(),'Classification (T)','data_16.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_17.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_18.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_19.csv',NOW(),0,1,'Null label'),
  (gen_random_uuid(),'Classification (T)','data_20.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_21.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_22.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_23.csv',NOW(),0,1,'Encoding error'),
  (gen_random_uuid(),'Classification (T)','data_24.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_25.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_26.csv',NOW(),1,0,NULL),
  (gen_random_uuid(),'Classification (T)','data_27.csv',NOW(),1,0,NULL);
