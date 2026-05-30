-- Migration 026: Trigger function to auto-compute error_hash AND error on INSERT/UPDATE
-- error_detail → error (last line, before first colon) + error_hash (MD5 of error_detail)

CREATE OR REPLACE FUNCTION compute_error_hash()
RETURNS TRIGGER AS $$
DECLARE
  v_detail TEXT;
  v_lines  TEXT[];
  v_last   TEXT;
BEGIN
  v_detail := TRIM(NEW.error_detail);

  IF v_detail IS NOT NULL AND v_detail <> '' THEN
    v_lines := string_to_array(v_detail, E'\n');
    FOR i IN REVERSE array_upper(v_lines, 1) .. 1 LOOP
      IF TRIM(v_lines[i]) <> '' THEN
        v_last := TRIM(v_lines[i]);
        EXIT;
      END IF;
    END LOOP;
    NEW.error := TRIM(split_part(v_last, ':', 1));
  END IF;

  -- error_hash is NOT touched here — backend owns hash generation

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Attach trigger to all 85 project tablesCREATE OR REPLACE TRIGGER trg_error_hash_DigiEdit_Language_Books
  BEFORE INSERT OR UPDATE ON "DigiEdit_Language_(Books)"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_DigiEdit_Language_Journals
  BEFORE INSERT OR UPDATE ON "DigiEdit_Language_(Journals)"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Language_Editing
  BEFORE INSERT OR UPDATE ON "Language_Editing"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Language_Quality_Score
  BEFORE INSERT OR UPDATE ON "Language_Quality_Score"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Language_Errors_Count
  BEFORE INSERT OR UPDATE ON "Language_Errors_Count"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_PPT_Generator
  BEFORE INSERT OR UPDATE ON "PPT_Generator"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Content_Creation
  BEFORE INSERT OR UPDATE ON "Content_Creation"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Image_Comparision_tool
  BEFORE INSERT OR UPDATE ON "Image_Comparision_tool"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_DEI
  BEFORE INSERT OR UPDATE ON "DEI"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Meta_Data_Extraction
  BEFORE INSERT OR UPDATE ON "Meta_Data_Extraction"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Synthetic_Data_Generation
  BEFORE INSERT OR UPDATE ON "Synthetic_Data_Generation"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Alt_Text_JSON_and_ZIP
  BEFORE INSERT OR UPDATE ON "Alt_Text_(JSON_and_ZIP)"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Alt_Text_IDTF
  BEFORE INSERT OR UPDATE ON "Alt_Text_(IDTF)"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Alt_Text_EPUB
  BEFORE INSERT OR UPDATE ON "Alt_Text_(EPUB)"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Sematic_Search_Bot
  BEFORE INSERT OR UPDATE ON "Sematic_Search_Bot"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Alt_Text_single_image
  BEFORE INSERT OR UPDATE ON "Alt_Text_(single_image)"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Actual_Text
  BEFORE INSERT OR UPDATE ON "Actual_Text"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Story_Board_Assistance
  BEFORE INSERT OR UPDATE ON "Story_Board_Assistance"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Proof_Reading
  BEFORE INSERT OR UPDATE ON "Proof_Reading"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Abstract_and_Keywords
  BEFORE INSERT OR UPDATE ON "Abstract_and_Keywords"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Spell_Check
  BEFORE INSERT OR UPDATE ON "Spell_Check"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Speech_to_Text_Recognition
  BEFORE INSERT OR UPDATE ON "Speech_to_Text_Recognition"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_AI_Assessment_Creation
  BEFORE INSERT OR UPDATE ON "AI_Assessment_Creation"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_PDF_chatbot
  BEFORE INSERT OR UPDATE ON "PDF_chatbot"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Image_relabelling
  BEFORE INSERT OR UPDATE ON "Image_relabelling"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Simple_Language_Summary
  BEFORE INSERT OR UPDATE ON "Simple_Language_Summary"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Summary_generation
  BEFORE INSERT OR UPDATE ON "Summary_generation"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Highwire_Chatbot
  BEFORE INSERT OR UPDATE ON "Highwire_Chatbot"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Image_Processing
  BEFORE INSERT OR UPDATE ON "Image_Processing"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_AI_QC
  BEFORE INSERT OR UPDATE ON "AI_QC"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Translation_Extraction
  BEFORE INSERT OR UPDATE ON "Translation(Extraction)"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Translation_Import
  BEFORE INSERT OR UPDATE ON "Translation(Import)"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Image_upscaling
  BEFORE INSERT OR UPDATE ON "Image_upscaling"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Image_generator
  BEFORE INSERT OR UPDATE ON "Image_generator"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Language_Translation
  BEFORE INSERT OR UPDATE ON "Language_Translation"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Taxonomy
  BEFORE INSERT OR UPDATE ON "Taxonomy"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Email_Sentiment_Analysis
  BEFORE INSERT OR UPDATE ON "Email_Sentiment_Analysis"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Chatbot_response_labelling
  BEFORE INSERT OR UPDATE ON "Chatbot_response_labelling"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_XML_Heading_Hierarchy
  BEFORE INSERT OR UPDATE ON "XML_Heading_Hierarchy"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_XML_Element_Prediction
  BEFORE INSERT OR UPDATE ON "XML_Element_Prediction"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Grammar_Check_CG
  BEFORE INSERT OR UPDATE ON "Grammar_Check_(C&G)"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Grammar_Check_CG_Word
  BEFORE INSERT OR UPDATE ON "Grammar_Check_(C&G)_-_Word"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Grammar_Check_CG_XML
  BEFORE INSERT OR UPDATE ON "Grammar_Check_(C&G)_-_XML"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Edition_Evolution_Analyzer
  BEFORE INSERT OR UPDATE ON "Edition_Evolution_Analyzer"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Knowledge_Graph
  BEFORE INSERT OR UPDATE ON "Knowledge_Graph"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_AI_XML_Processing
  BEFORE INSERT OR UPDATE ON "AI_XML_Processing"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_FM_Structuring
  BEFORE INSERT OR UPDATE ON "FM_Structuring"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Bibliography_Structuring
  BEFORE INSERT OR UPDATE ON "Bibliography_Structuring"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Story_board_creation
  BEFORE INSERT OR UPDATE ON "Story_board_creation"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Edit_Optimization
  BEFORE INSERT OR UPDATE ON "Edit_Optimization"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_JSON_Translation
  BEFORE INSERT OR UPDATE ON "JSON_Translation"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_HTML_Conversion
  BEFORE INSERT OR UPDATE ON "HTML_Conversion"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_eMFC_XML_Rule_Report_Generation
  BEFORE INSERT OR UPDATE ON "eMFC_XML_Rule_Report_Generation"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_TOC_Extractor
  BEFORE INSERT OR UPDATE ON "TOC_Extractor"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_MultiModal_Alt_Text
  BEFORE INSERT OR UPDATE ON "MultiModal_Alt_Text"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Docx_Alt_text_Generation
  BEFORE INSERT OR UPDATE ON "Docx_Alt_text_Generation"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_DEI_Image_Check
  BEFORE INSERT OR UPDATE ON "DEI_Image_Check"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Peer_Reviewer_Finding
  BEFORE INSERT OR UPDATE ON "Peer_Reviewer_Finding"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Language_Translation_D
  BEFORE INSERT OR UPDATE ON "Language_Translation(D)"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Indexing
  BEFORE INSERT OR UPDATE ON "Indexing"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Database_Chat_Text2SQL
  BEFORE INSERT OR UPDATE ON "Database_Chat_(Text2SQL)"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_XML_QC
  BEFORE INSERT OR UPDATE ON "XML(QC)"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Image_processing_Dashboard
  BEFORE INSERT OR UPDATE ON "Image_processing_Dashboard"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Element_Prediction_Dashboard
  BEFORE INSERT OR UPDATE ON "Element_Prediction_Dashboard"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Alt_Text_Dashboard_M1
  BEFORE INSERT OR UPDATE ON "Alt_Text_Dashboard_(M1)"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_ALT_TEXT_DASHBOARD_E
  BEFORE INSERT OR UPDATE ON "ALT_TEXT_DASHBOARD_(E)"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Alt_Text_Dashboard_M2
  BEFORE INSERT OR UPDATE ON "Alt-Text_Dashboard_(M2)"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Lewis_AB_Testing
  BEFORE INSERT OR UPDATE ON "Lewis_A/B_Testing"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Data_Labelling_Dashboard
  BEFORE INSERT OR UPDATE ON "Data_Labelling_Dashboard"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Lewis_Review_Dashboard
  BEFORE INSERT OR UPDATE ON "Lewis_Review_Dashboard"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Classification_Accuracy_Dashboard
  BEFORE INSERT OR UPDATE ON "Classification_Accuracy_Dashboard"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Classification_T
  BEFORE INSERT OR UPDATE ON "Classification_(T)"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Peer_Review_Critique
  BEFORE INSERT OR UPDATE ON "Peer_Review_Critique"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Gen_AI_Email_Assistant
  BEFORE INSERT OR UPDATE ON "Gen_AI_-_Email_Assistant"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Chatbot_Assistant
  BEFORE INSERT OR UPDATE ON "Chatbot_Assistant"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Gen_AI_Image_Analytics
  BEFORE INSERT OR UPDATE ON "Gen_AI-Image_Analytics"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Gen_AI_Papers_to_Audio
  BEFORE INSERT OR UPDATE ON "Gen_AI_-_Papers_to_Audio"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Scientific_Illustration_Generator
  BEFORE INSERT OR UPDATE ON "Scientific_Illustration_Generator"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Gen_AI_Voice_audit_System
  BEFORE INSERT OR UPDATE ON "Gen_AI_-_Voice_audit_System"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_GenAI_Anonymization_Tool
  BEFORE INSERT OR UPDATE ON "GenAI_Anonymization_Tool"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_AI_Content_Detector
  BEFORE INSERT OR UPDATE ON "AI_Content_Detector"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_TandF_Rubriq_proessing
  BEFORE INSERT OR UPDATE ON "TandF_Rubriq_proessing"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_TandF_LAT_Score_for_tracks
  BEFORE INSERT OR UPDATE ON "TandF_LAT_Score_for_tracks"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();

CREATE OR REPLACE TRIGGER trg_error_hash_Image_Forensics
  BEFORE INSERT OR UPDATE ON "Image_Forensics"
  FOR EACH ROW EXECUTE FUNCTION compute_error_hash();
