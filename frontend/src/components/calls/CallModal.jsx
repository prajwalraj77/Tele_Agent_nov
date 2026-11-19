// ============================================================
// CALL MODAL
// ============================================================
// Allows the user to enter a phone number and start a call.
// ============================================================

import { useEffect, useState } from "react";

function CallModal({
  open,
  initialPhone = "",
  onClose,
  onCall,
}) {
  const [phoneNumber, setPhoneNumber] =
    useState(initialPhone);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    setPhoneNumber(initialPhone || "");
    setError("");
  }, [initialPhone, open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanedPhone =
      phoneNumber.replace(/\D/g, "");

    if (cleanedPhone.length < 10) {
      setError(
        "Please enter a valid phone number.",
      );

      return;
    }

    try {
      setLoading(true);
      setError("");

      await onCall(cleanedPhone);
    } catch (err) {
      setError(
        err.message ||
          "Unable to start the call.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={onClose}
    >
      <div
        className="modal-card"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="modal-header">
          <div>
            <h2>Make a Call</h2>

            <p>
              Enter the customer's phone
              number.
            </p>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label
            className="form-label"
            htmlFor="phoneNumber"
          >
            Phone number
          </label>

          <input
            id="phoneNumber"
            className="form-input"
            type="tel"
            value={phoneNumber}
            onChange={(event) =>
              setPhoneNumber(
                event.target.value,
              )
            }
            placeholder="8197983277"
            autoFocus
          />

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="button button-primary"
              disabled={loading}
            >
              {loading
                ? "Calling..."
                : "Start Call"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CallModal;