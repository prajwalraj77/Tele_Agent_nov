const {
  findDueCallbacks,
  markCallbackProcessing,
} = require("./callbackService");


async function checkCallbacks() {

  try {

    const callbacks =
      await findDueCallbacks();


    if (
      callbacks.length === 0
    ) {

      console.log(
        "Callback scheduler: no callbacks due."
      );

      return;

    }


    console.log(
      `Callback scheduler: ${callbacks.length} callback(s) due.`
    );


    for (
      const call of callbacks
    ) {

      const processingCall =
        await markCallbackProcessing(
          call.callId
        );


      if (!processingCall) {

        console.log(
          "Callback already being processed:",
          call.callId
        );

        continue;

      }


      console.log(
        "Callback marked as processing:",
        processingCall.callId
      );


      console.log(
        "Customer:",
        processingCall.customerId
      );


      console.log(
        "Follow-up:",
        processingCall.followUpAt
      );

    }

  } catch (error) {

    console.error(
      "Callback scheduler failed:",
      error
    );

  }

}


function startCallbackScheduler() {

  console.log(
    "Callback scheduler started."
  );


  checkCallbacks();


  setInterval(
    checkCallbacks,
    60 * 1000
  );

}


module.exports = {
  startCallbackScheduler,
};