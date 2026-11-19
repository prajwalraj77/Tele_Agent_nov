// ============================================================
// EXOTEL CLIENT
// ============================================================
// Handles low-level Exotel WebSocket communication and extracts
// Call SID/phone information from Exotel events.
// ============================================================

function pickFirstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

// Gets the Exotel Call SID from a WebSocket event or URL.
function getExotelCallSid(data, url) {
  return pickFirstString(
    url.searchParams.get("CallSid"),
    url.searchParams.get("callSid"),
    url.searchParams.get("call_sid"),

    data?.call_sid,
    data?.callSid,
    data?.CallSid,
    data?.sid,
    data?.Sid,

    data?.start?.call_sid,
    data?.start?.callSid,
    data?.start?.CallSid,
    data?.start?.sid,
    data?.start?.Sid,

    data?.connected?.call_sid,
    data?.connected?.callSid,
    data?.connected?.CallSid,
    data?.connected?.sid,
    data?.connected?.Sid,

    data?.stop?.call_sid,
    data?.stop?.callSid,
    data?.stop?.CallSid,
    data?.stop?.sid,
    data?.stop?.Sid,
  );
}

// Gets the customer's phone number from a WebSocket event or URL.
function getExotelPhoneNumber(data, url) {
  return pickFirstString(
    url.searchParams.get("From"),
    url.searchParams.get("from"),
    url.searchParams.get("phoneNumber"),
    url.searchParams.get("phone"),

    data?.from,
    data?.From,
    data?.phoneNumber,
    data?.phone,
    data?.caller,
    data?.Caller,

    data?.start?.from,
    data?.start?.From,
    data?.start?.phoneNumber,
    data?.start?.phone,
    data?.start?.caller,
    data?.start?.Caller,

    data?.start?.custom_parameters?.From,
    data?.start?.custom_parameters?.from,

    data?.start?.customParameters?.From,
    data?.start?.customParameters?.from,

    data?.connected?.from,
    data?.connected?.From,
  );
}

// Creates the low-level Exotel WebSocket operations used by the other modules.
function createExotelClient(ws, state) {
  function setStreamSid(newStreamSid) {
    if (!newStreamSid || state.streamSid === newStreamSid) {
      return;
    }

    state.streamSid = newStreamSid;

    console.log("Exotel Stream SID:", state.streamSid);
  }

  function clearExotelAudio() {
    if (!state.streamSid || ws.readyState !== ws.OPEN) {
      return;
    }

    try {
      ws.send(
        JSON.stringify({
          event: "clear",
          stream_sid: state.streamSid,
        }),
      );

      console.log(">>> EXOTEL CLEAR SENT");
    } catch (error) {
      console.error("Failed to clear Exotel audio:", error);
    }
  }

  function sendOneAudioChunk(chunk) {
    if (!state.streamSid || ws.readyState !== ws.OPEN) {
      return false;
    }

    if (!chunk || chunk.length === 0) {
      return false;
    }

    try {
      ws.send(
        JSON.stringify({
          event: "media",
          stream_sid: state.streamSid,
          media: {
            payload: chunk.toString("base64"),
          },
        }),
      );

      state.audioChunksSent++;

      if (state.firstExotelAudioAt === null) {
        state.firstExotelAudioAt = Date.now();

        console.log(
          "First AI audio sent to Exotel after:",
          state.firstExotelAudioAt - state.callStartedAt,
          "ms",
        );
      }

      return true;
    } catch (error) {
      console.error("Failed to send audio to Exotel:", error);

      return false;
    }
  }

  return {
    setStreamSid,
    clearExotelAudio,
    sendOneAudioChunk,
  };
}

module.exports = {
  getExotelCallSid,
  getExotelPhoneNumber,
  createExotelClient,
};
