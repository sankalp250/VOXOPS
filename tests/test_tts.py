import pytest
from app.services.tts_service import tts_service


@pytest.mark.asyncio
async def test_tts_mock_synthesis():
    text = "Hello, your order has been placed successfully."
    audio_bytes, provider, latency = await tts_service.synthesize_with_fallback(text, language_code="en")
    
    assert len(audio_bytes) > 44
    assert provider in ["mock_synthesizer", "elevenlabs", "sarvam"]
    assert latency >= 0


@pytest.mark.asyncio
async def test_tts_indian_language_fallback():
    hindi_text = "नमस्ते, आपकी अपॉइंटमेंट बुक हो गई है।"
    audio_bytes, provider, latency = await tts_service.synthesize_with_fallback(hindi_text, language_code="hi-IN")
    
    assert len(audio_bytes) > 44
    assert provider in ["mock_synthesizer", "sarvam", "elevenlabs"]
