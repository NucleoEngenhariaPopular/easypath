"""
Unit tests for loop condition evaluation.
"""

import pytest
from unittest.mock import MagicMock, patch
from app.core.loop_evaluator import should_loop, _build_evaluation_prompt, _parse_evaluation_response
from app.models.flow import Node, Prompt
from app.models.session import ChatSession, Message


class TestShouldLoop:
    """Tests for the should_loop function."""

    def test_loop_not_enabled(self):
        """Test that loop returns False when loop_enabled is False."""
        node = Node(
            id="test-node",
            node_type="normal",
            loop_enabled=False,
            loop_condition="some condition"
        )
        session = ChatSession(session_id="test-session", current_node_id="test-node")

        should_continue, llm_info = should_loop(node, session)

        assert should_continue is False
        assert llm_info["model_name"] == "none"
        assert llm_info["total_tokens"] == 0

    def test_loop_enabled_but_empty_condition(self):
        """Test that loop returns False when condition is empty."""
        node = Node(
            id="test-node",
            node_type="normal",
            loop_enabled=True,
            loop_condition=""
        )
        session = ChatSession(session_id="test-session", current_node_id="test-node")

        should_continue, llm_info = should_loop(node, session)

        assert should_continue is False
        assert llm_info["model_name"] == "none"

    @patch('app.core.loop_evaluator.get_llm')
    def test_loop_condition_met(self, mock_get_llm):
        """Test that loop returns True when LLM says to LOOP."""
        # Mock LLM response
        mock_llm = MagicMock()
        mock_llm_response = MagicMock()
        mock_llm_response.success = True
        mock_llm_response.response = "LOOP"
        mock_llm_response.timing_ms = 100.0
        mock_llm_response.model_name = "test-model"
        mock_llm_response.input_tokens = 50
        mock_llm_response.output_tokens = 5
        mock_llm_response.total_tokens = 55
        mock_llm_response.estimated_cost_usd = 0.001
        mock_llm.chat.return_value = mock_llm_response
        mock_get_llm.return_value = mock_llm

        node = Node(
            id="test-node",
            node_type="normal",
            loop_enabled=True,
            loop_condition="Continue until user provides valid answer"
        )
        session = ChatSession(session_id="test-session", current_node_id="test-node")
        session.add_user_message("invalid answer")

        should_continue, llm_info = should_loop(node, session)

        assert should_continue is True
        assert llm_info["model_name"] == "test-model"
        assert llm_info["total_tokens"] == 55
        assert llm_info["condition_met"] is True

    @patch('app.core.loop_evaluator.get_llm')
    def test_loop_condition_not_met(self, mock_get_llm):
        """Test that loop returns False when LLM says to PROCEED."""
        # Mock LLM response
        mock_llm = MagicMock()
        mock_llm_response = MagicMock()
        mock_llm_response.success = True
        mock_llm_response.response = "PROCEED"
        mock_llm_response.timing_ms = 100.0
        mock_llm_response.model_name = "test-model"
        mock_llm_response.input_tokens = 50
        mock_llm_response.output_tokens = 5
        mock_llm_response.total_tokens = 55
        mock_llm_response.estimated_cost_usd = 0.001
        mock_llm.chat.return_value = mock_llm_response
        mock_get_llm.return_value = mock_llm

        node = Node(
            id="test-node",
            node_type="normal",
            loop_enabled=True,
            loop_condition="Continue until user provides valid answer"
        )
        session = ChatSession(session_id="test-session", current_node_id="test-node")
        session.add_user_message("correct answer")

        should_continue, llm_info = should_loop(node, session)

        assert should_continue is False
        assert llm_info["model_name"] == "test-model"
        assert llm_info["condition_met"] is False

    @patch('app.core.loop_evaluator.get_llm')
    def test_loop_llm_failure(self, mock_get_llm):
        """Test that loop returns False when LLM fails."""
        # Mock LLM failure
        mock_llm = MagicMock()
        mock_llm_response = MagicMock()
        mock_llm_response.success = False
        mock_llm_response.error_message = "API error"
        mock_llm_response.timing_ms = 50.0
        mock_llm_response.model_name = "test-model"
        mock_llm_response.input_tokens = 0
        mock_llm_response.output_tokens = 0
        mock_llm_response.total_tokens = 0
        mock_llm_response.estimated_cost_usd = 0.0
        mock_llm.chat.return_value = mock_llm_response
        mock_get_llm.return_value = mock_llm

        node = Node(
            id="test-node",
            node_type="normal",
            loop_enabled=True,
            loop_condition="Continue until user provides valid answer"
        )
        session = ChatSession(session_id="test-session", current_node_id="test-node")

        should_continue, llm_info = should_loop(node, session)

        # Should default to False (proceed) on error
        assert should_continue is False


class TestBuildEvaluationPrompt:
    """Tests for the _build_evaluation_prompt function."""

    def test_build_basic_prompt(self):
        """Test building a basic evaluation prompt."""
        node = Node(
            id="test-node",
            node_type="normal",
            loop_condition="Continue until user provides name"
        )
        session = ChatSession(session_id="test-session", current_node_id="test-node")
        session.add_user_message("Hello")
        session.add_assistant_message("What is your name?")

        prompt = _build_evaluation_prompt(node, session)

        assert "Continue until user provides name" in prompt
        assert "USER: Hello" in prompt
        assert "ASSISTANT: What is your name?" in prompt
        assert "LOOP" in prompt
        assert "PROCEED" in prompt

    def test_build_prompt_with_variables(self):
        """Test building prompt with extracted variables."""
        node = Node(
            id="test-node",
            node_type="normal",
            loop_condition="Continue until age >= 18"
        )
        session = ChatSession(session_id="test-session", current_node_id="test-node")
        session.add_user_message("I am 16")
        session.set_variable("user_age", "16")

        prompt = _build_evaluation_prompt(node, session)

        assert "Continue until age >= 18" in prompt
        assert "user_age: 16" in prompt


class TestParseEvaluationResponse:
    """Tests for the _parse_evaluation_response function."""

    def test_parse_loop_response(self):
        """Test parsing a LOOP response."""
        assert _parse_evaluation_response("LOOP") is True
        assert _parse_evaluation_response("loop") is True
        assert _parse_evaluation_response("  LOOP  ") is True
        assert _parse_evaluation_response("The answer is LOOP") is True

    def test_parse_proceed_response(self):
        """Test parsing a PROCEED response."""
        assert _parse_evaluation_response("PROCEED") is False
        assert _parse_evaluation_response("proceed") is False
        assert _parse_evaluation_response("  PROCEED  ") is False
        assert _parse_evaluation_response("We should PROCEED") is False

    def test_parse_ambiguous_response(self):
        """Test parsing ambiguous responses defaults to PROCEED."""
        # If both words appear, PROCEED takes precedence
        assert _parse_evaluation_response("LOOP or PROCEED") is False

        # Empty response defaults to PROCEED
        assert _parse_evaluation_response("") is False

        # Unclear response defaults to PROCEED
        assert _parse_evaluation_response("I'm not sure") is False

    def test_parse_case_insensitive(self):
        """Test that parsing is case-insensitive."""
        assert _parse_evaluation_response("Loop") is True
        assert _parse_evaluation_response("LoOp") is True
        assert _parse_evaluation_response("Proceed") is False
        assert _parse_evaluation_response("PROCEED") is False
