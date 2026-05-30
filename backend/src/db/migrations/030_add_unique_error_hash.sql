-- Migration 030 (final): Add partial UNIQUE INDEX on error_hash (WHERE error_hash IS NOT NULL)
-- This supports manual UPDATE+INSERT upsert without ON CONFLICT.
-- Non-error rows (error_hash IS NULL) are unaffected.
--
-- Per table:
--   Step 1: Fill NULL error_hash from error column
--   Step 2: Remove duplicate error_hash rows (ROW_NUMBER — deterministic)
--   Step 3: Create partial UNIQUE INDEX WHERE error_hash IS NOT NULL
--
-- Idempotent: safe to run multiple times.

DO $$
DECLARE
  t          TEXT;
  index_name TEXT;
BEGIN
  FOR t IN VALUES
    ('DigiEdit_Language_(Books)'),('DigiEdit_Language_(Journals)'),('Language_Editing'),
    ('Language_Quality_Score'),('Language_Errors_Count'),('PPT_Generator'),
    ('Content_Creation'),('Image_Comparision_tool'),('DEI'),('Meta_Data_Extraction'),
    ('Synthetic_Data_Generation'),('Alt_Text_(JSON_and_ZIP)'),('Alt_Text_(IDTF)'),
    ('Alt_Text_(EPUB)'),('Sematic_Search_Bot'),('Alt_Text_(single_image)'),
    ('Actual_Text'),('Story_Board_Assistance'),('Proof_Reading'),('Abstract_and_Keywords'),
    ('Spell_Check'),('Speech_to_Text_Recognition'),('AI_Assessment_Creation'),
    ('PDF_chatbot'),('Image_relabelling'),('Simple_Language_Summary'),
    ('Summary_generation'),('Highwire_Chatbot'),('Image_Processing'),('AI_QC'),
    ('Translation(Extraction)'),('Translation(Import)'),('Image_upscaling'),
    ('Image_generator'),('Language_Translation'),('Taxonomy'),('Email_Sentiment_Analysis'),
    ('Chatbot_response_labelling'),('XML_Heading_Hierarchy'),('XML_Element_Prediction'),
    ('Grammar_Check_(C&G)'),('Grammar_Check_(C&G)_-_Word'),('Grammar_Check_(C&G)_-_XML'),
    ('Edition_Evolution_Analyzer'),('Knowledge_Graph'),('AI_XML_Processing'),
    ('FM_Structuring'),('Bibliography_Structuring'),('Story_board_creation'),
    ('Edit_Optimization'),('JSON_Translation'),('HTML_Conversion'),
    ('eMFC_XML_Rule_Report_Generation'),('TOC_Extractor'),('MultiModal_Alt_Text'),
    ('Docx_Alt_text_Generation'),('DEI_Image_Check'),('Peer_Reviewer_Finding'),
    ('Language_Translation(D)'),('Indexing'),('Database_Chat_(Text2SQL)'),('XML(QC)'),
    ('Image_processing_Dashboard'),('Element_Prediction_Dashboard'),
    ('Alt_Text_Dashboard_(M1)'),('ALT_TEXT_DASHBOARD_(E)'),('Alt-Text_Dashboard_(M2)'),
    ('Lewis_A/B_Testing'),('Data_Labelling_Dashboard'),('Lewis_Review_Dashboard'),
    ('Classification_Accuracy_Dashboard'),('Classification_(T)'),('Peer_Review_Critique'),
    ('Gen_AI_-_Email_Assistant'),('Chatbot_Assistant'),('Gen_AI-Image_Analytics'),
    ('Gen_AI_-_Papers_to_Audio'),('Scientific_Illustration_Generator'),
    ('Gen_AI_-_Voice_audit_System'),('GenAI_Anonymization_Tool'),('AI_Content_Detector'),
    ('TandF_Rubriq_proessing'),('TandF_LAT_Score_for_tracks')
  LOOP

    -- Step 1: Fill NULL error_hash from error column
    EXECUTE format(
      'UPDATE %I SET error_hash = md5(lower(trim(error)))
       WHERE error_hash IS NULL AND error IS NOT NULL AND trim(error) <> ''''',
      t
    );

    -- Step 2: Remove duplicate error_hash rows (keep best: highest failure_count, latest timestamp)
    EXECUTE format(
      'DELETE FROM %I WHERE id IN (
         SELECT id FROM (
           SELECT id,
                  ROW_NUMBER() OVER (
                    PARTITION BY error_hash
                    ORDER BY failure_count DESC, timestamp DESC, id DESC
                  ) AS rn
           FROM %I
           WHERE error_hash IS NOT NULL
         ) sub
         WHERE rn > 1
       )',
      t, t
    );

    -- Step 3: Create partial UNIQUE INDEX on error_hash WHERE NOT NULL
    -- Partial index: non-error rows (NULL hash) are completely unaffected
    -- Does NOT use ON CONFLICT — works with manual UPDATE+INSERT pattern
    index_name := 'ueh_' || md5(t);

    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename  = t
        AND indexname  = index_name
    ) THEN
      EXECUTE format(
        'CREATE UNIQUE INDEX %I ON %I (error_hash) WHERE error_hash IS NOT NULL',
        index_name, t
      );
      RAISE NOTICE 'Created partial UNIQUE INDEX % on table %', index_name, t;
    ELSE
      RAISE NOTICE 'Index already exists on table %, skipping', t;
    END IF;

  END LOOP;
END $$;
