-- Migration 011: Add category column to projects

ALTER TABLE projects ADD COLUMN IF NOT EXISTS category TEXT;

UPDATE projects SET category = 'Gen AI' WHERE name IN (
  'DigiEdit Language (Books)', 'DigiEdit Language (Journals)', 'Language Editing',
  'PPT Generator', 'Content Creation', 'Alt Text (JSON and ZIP)', 'Alt Text (IDTF)',
  'Alt Text (EPUB)', 'Alt Text (single image)', 'Actual Text', 'Story Board Assistance',
  'Abstract and Keywords', 'AI Assessment Creation', 'Simple Language Summary',
  'Image generator', 'AI XML Processing', 'FM Structuring', 'Bibliography Structuring',
  'JSON Translation', 'HTML Conversion', 'eMFC XML Rule Report Generation',
  'MultiModal Alt Text', 'Docx Alt text Generation', 'PDF chatbot',
  'Edition Evolution Analyzer', 'TandF Rubriq proessing', 'TandF LAT Score for tracks',
  'Peer Reviewer Finding', 'Language Translation(D)'
);

UPDATE projects SET category = 'Computer Vision' WHERE name IN (
  'Image Comparision tool', 'Image Processing', 'Image Forensics',
  'Image relabelling', 'Image upscaling', 'Spell Check', 'Speech to Text Recognition',
  'Meta Data Extraction', 'Proof Reading', 'Summary generation', 'Highwire Chatbot',
  'PDF chatbot', 'Sematic Search Bot', 'Gen AI-Image Analytics', 'DEI Image Check'
);

UPDATE projects SET category = 'Traditional Model' WHERE name IN (
  'DEI', 'Translation(Extraction)', 'Translation(Import)', 'Email Sentiment Analysis',
  'Chatbot response labelling', 'XML Heading Hierarchy', 'Grammar Check (C&G)',
  'Grammar Check (C&G) - Word', 'Grammar Check (C&G) - XML',
  'Story board creation', 'Edit Optimization', 'Lewis A/B Testing',
  'Data Labelling Dashboard', 'Lewis Review Dashboard',
  'Classification Accuracy Dashboard', 'Classification (T)',
  'Peer Review Critique', 'Gen AI - Email Assistant', 'Chatbot Assistant',
  'Gen AI - Papers to Audio', 'Scientific Illustration Generator',
  'Gen AI - Voice audit System', 'GenAI Anonymization Tool', 'AI Content Detector',
  'TOC Extractor', 'XML(QC)', 'Language Errors Count', 'Language Quality Score'
);

UPDATE projects SET category = 'RAG' WHERE name IN (
  'Synthetic Data Generation', 'Taxonomy', 'Knowledge_Graph'
);

UPDATE projects SET category = 'Analytics' WHERE name IN (
  'Image processing Dashboard', 'Element Prediction Dashboard',
  'Alt Text Dashboard (M1)', 'ALT TEXT DASHBOARD (E)', 'Alt-Text Dashboard (M2)'
);

UPDATE projects SET category = 'Generation' WHERE name IN (
  'Language Translation', 'XML Element Prediction', 'AI QC',
  'Indexing', 'Database Chat (Text2SQL)'
);

-- fallback for anything uncategorized
UPDATE projects SET category = 'Gen AI' WHERE category IS NULL;
