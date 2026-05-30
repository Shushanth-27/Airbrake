-- Migration 014: Create and seed AI QC, Translation(Extraction), Translation(Import), Image upscaling

CREATE TABLE IF NOT EXISTS "AI_QC" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'AI QC',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Translation(Extraction)" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Translation(Extraction)',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Translation(Import)" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Translation(Import)',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Image_upscaling" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Image upscaling',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

-- AI QC — 8 rows
INSERT INTO "AI_QC" VALUES
  (gen_random_uuid(),'AI QC','qc_doc_1.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI QC','qc_doc_2.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI QC','qc_doc_3.pdf',NOW(),0,1,'Layout parse error'),
  (gen_random_uuid(),'AI QC','qc_doc_4.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI QC','qc_doc_5.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI QC','qc_doc_6.pdf',NOW(),0,1,'Spacing check failed'),
  (gen_random_uuid(),'AI QC','qc_doc_7.pdf',NOW(),1,0,NULL),
  (gen_random_uuid(),'AI QC','qc_doc_8.pdf',NOW(),1,0,NULL);

-- Translation(Extraction) — 10 rows
INSERT INTO "Translation(Extraction)" VALUES
  (gen_random_uuid(),'Translation(Extraction)','extract_1.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Extraction)','extract_2.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Extraction)','extract_3.js',NOW(),0,1,'Pattern not recognised'),
  (gen_random_uuid(),'Translation(Extraction)','extract_4.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Extraction)','extract_5.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Extraction)','extract_6.js',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Extraction)','extract_7.json',NOW(),0,1,'Key mismatch'),
  (gen_random_uuid(),'Translation(Extraction)','extract_8.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Extraction)','extract_9.js',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Extraction)','extract_10.json',NOW(),1,0,NULL);

-- Translation(Import) — 15 rows
INSERT INTO "Translation(Import)" VALUES
  (gen_random_uuid(),'Translation(Import)','import_1.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Import)','import_2.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Import)','import_3.js',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Import)','import_4.json',NOW(),0,1,'Encoding error'),
  (gen_random_uuid(),'Translation(Import)','import_5.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Import)','import_6.js',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Import)','import_7.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Import)','import_8.json',NOW(),0,1,'Missing placeholder'),
  (gen_random_uuid(),'Translation(Import)','import_9.js',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Import)','import_10.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Import)','import_11.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Import)','import_12.js',NOW(),0,1,'Null value in key'),
  (gen_random_uuid(),'Translation(Import)','import_13.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Import)','import_14.json',NOW(),1,0,NULL),
  (gen_random_uuid(),'Translation(Import)','import_15.js',NOW(),1,0,NULL);

-- Image upscaling — 28 rows
INSERT INTO "Image_upscaling" VALUES
  (gen_random_uuid(),'Image upscaling','img_1.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_2.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_3.jpg',NOW(),0,1,'Low resolution input'),
  (gen_random_uuid(),'Image upscaling','img_4.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_5.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_6.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_7.png',NOW(),0,1,'Model timeout'),
  (gen_random_uuid(),'Image upscaling','img_8.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_9.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_10.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_11.png',NOW(),0,1,'Corrupt file'),
  (gen_random_uuid(),'Image upscaling','img_12.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_13.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_14.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_15.jpg',NOW(),0,1,'Upscale factor out of range'),
  (gen_random_uuid(),'Image upscaling','img_16.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_17.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_18.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_19.png',NOW(),0,1,'Memory exceeded'),
  (gen_random_uuid(),'Image upscaling','img_20.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_21.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_22.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_23.png',NOW(),0,1,'Unsupported format'),
  (gen_random_uuid(),'Image upscaling','img_24.jpg',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_25.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_26.png',NOW(),1,0,NULL),
  (gen_random_uuid(),'Image upscaling','img_27.jpg',NOW(),0,1,'GPU unavailable'),
  (gen_random_uuid(),'Image upscaling','img_28.png',NOW(),1,0,NULL);
