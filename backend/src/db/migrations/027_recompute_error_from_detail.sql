-- Migration 027: For all rows where error_detail exists,
-- recompute error (last line before first colon) and error_hash (MD5 of error_detail).
-- Uses a helper function to extract the last non-empty line from a multiline traceback.

CREATE OR REPLACE FUNCTION extract_short_error(detail TEXT) RETURNS TEXT AS $$
DECLARE
  v_lines TEXT[];
  v_last  TEXT := '';
  i       INT;
BEGIN
  IF detail IS NULL OR TRIM(detail) = '' THEN
    RETURN NULL;
  END IF;
  v_lines := string_to_array(TRIM(detail), E'\n');
  FOR i IN REVERSE array_upper(v_lines, 1) .. 1 LOOP
    IF TRIM(v_lines[i]) <> '' THEN
      v_last := TRIM(v_lines[i]);
      EXIT;
    END IF;
  END LOOP;
  RETURN TRIM(split_part(v_last, ':', 1));
END;
$$ LANGUAGE plpgsql;

-- Apply to all 85 tables
UPDATE "DigiEdit_Language_(Books)"    SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "DigiEdit_Language_(Journals)" SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Language_Editing"             SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Language_Quality_Score"       SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Language_Errors_Count"        SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "PPT_Generator"                SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Content_Creation"             SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Image_Comparision_tool"       SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "DEI"                          SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Meta_Data_Extraction"         SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Synthetic_Data_Generation"    SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Alt_Text_(JSON_and_ZIP)"      SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Alt_Text_(IDTF)"              SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Alt_Text_(EPUB)"              SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Sematic_Search_Bot"           SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Alt_Text_(single_image)"      SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Actual_Text"                  SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Story_Board_Assistance"       SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Proof_Reading"                SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Abstract_and_Keywords"        SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Spell_Check"                  SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Speech_to_Text_Recognition"   SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "AI_Assessment_Creation"       SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "PDF_chatbot"                  SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Image_relabelling"            SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Simple_Language_Summary"      SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Summary_generation"           SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Highwire_Chatbot"             SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Image_Processing"             SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "AI_QC"                        SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Translation(Extraction)"      SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Translation(Import)"          SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Image_upscaling"              SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Image_generator"              SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Language_Translation"         SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Taxonomy"                     SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Email_Sentiment_Analysis"     SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Chatbot_response_labelling"   SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "XML_Heading_Hierarchy"        SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "XML_Element_Prediction"       SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Grammar_Check_(C&G)"          SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Grammar_Check_(C&G)_-_Word"   SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Grammar_Check_(C&G)_-_XML"    SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Edition_Evolution_Analyzer"   SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Knowledge_Graph"              SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "AI_XML_Processing"            SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "FM_Structuring"               SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Bibliography_Structuring"     SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Story_board_creation"         SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Edit_Optimization"            SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "JSON_Translation"             SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "HTML_Conversion"              SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "eMFC_XML_Rule_Report_Generation" SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "TOC_Extractor"                SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "MultiModal_Alt_Text"          SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Docx_Alt_text_Generation"     SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "DEI_Image_Check"              SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Peer_Reviewer_Finding"        SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Language_Translation(D)"      SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Indexing"                     SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Database_Chat_(Text2SQL)"     SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "XML(QC)"                      SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Image_processing_Dashboard"   SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Element_Prediction_Dashboard" SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Alt_Text_Dashboard_(M1)"      SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "ALT_TEXT_DASHBOARD_(E)"       SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Alt-Text_Dashboard_(M2)"      SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Lewis_A/B_Testing"            SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Data_Labelling_Dashboard"     SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Lewis_Review_Dashboard"       SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Classification_Accuracy_Dashboard" SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Classification_(T)"           SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Peer_Review_Critique"         SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Gen_AI_-_Email_Assistant"     SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Chatbot_Assistant"            SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Gen_AI-Image_Analytics"       SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Gen_AI_-_Papers_to_Audio"     SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Scientific_Illustration_Generator" SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "Gen_AI_-_Voice_audit_System"  SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "GenAI_Anonymization_Tool"     SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "AI_Content_Detector"          SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "TandF_Rubriq_proessing"       SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
UPDATE "TandF_LAT_Score_for_tracks"   SET error = extract_short_error(error_detail), error_hash = MD5(error_detail) WHERE error_detail IS NOT NULL AND TRIM(error_detail) <> '';
