/**********************************************************************
    Copyright 2020 Misty Robotics
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
        http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

    **WARRANTY DISCLAIMER.**

    * General. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, MISTY
    ROBOTICS PROVIDES THIS SAMPLE SOFTWARE "AS-IS" AND DISCLAIMS ALL
    WARRANTIES AND CONDITIONS, WHETHER EXPRESS, IMPLIED, OR STATUTORY,
    INCLUDING THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
    PURPOSE, TITLE, QUIET ENJOYMENT, ACCURACY, AND NON-INFRINGEMENT OF
    THIRD-PARTY RIGHTS. MISTY ROBOTICS DOES NOT GUARANTEE ANY SPECIFIC
    RESULTS FROM THE USE OF THIS SAMPLE SOFTWARE. MISTY ROBOTICS MAKES NO
    WARRANTY THAT THIS SAMPLE SOFTWARE WILL BE UNINTERRUPTED, FREE OF VIRUSES
    OR OTHER HARMFUL CODE, TIMELY, SECURE, OR ERROR-FREE.
    * Use at Your Own Risk. YOU USE THIS SAMPLE SOFTWARE AND THE PRODUCT AT
    YOUR OWN DISCRETION AND RISK. YOU WILL BE SOLELY RESPONSIBLE FOR (AND MISTY
    ROBOTICS DISCLAIMS) ANY AND ALL LOSS, LIABILITY, OR DAMAGES, INCLUDING TO
    ANY HOME, PERSONAL ITEMS, PRODUCT, OTHER PERIPHERALS CONNECTED TO THE PRODUCT,
    COMPUTER, AND MOBILE DEVICE, RESULTING FROM YOUR USE OF THIS SAMPLE SOFTWARE
    OR PRODUCT.

    Please refer to the Misty Robotics End User License Agreement for further
    information and full details:
        https://www.mistyrobotics.com/legal/end-user-license-agreement/
**********************************************************************/


/*
NOTE: This skill is NOT set to start on boot up. To change this, add
"Startup" to the "StartupRules" array in the
conciergeBaseTemplate.json meta file.
*/

// ======================= Set Your Credentials Here ==================

function setCredentials() 
{
    misty.Set('cloudFunctionAuthTokenURL', "YOUR_TRIGGER_URL_TO_GOOGLE_CLOUD_FUNCTION_THAT_PROVIDES_ACCESS_TOKEN", false);
    misty.Set("GoogleCloudProjectID", "YOUR_GOOGLE_CLOUD_PROJECT_ID", false);
    misty.Set("langCodeForTTS", "en-US", false);
}
setCredentials();

// ====================================================================

function robotHomePosition() 
{
    misty.MoveHead(0, 0, 0, null, 1);
    misty.DisplayImage("e_DefaultContent.jpg");
    misty.MoveArmDegrees("both", 90, 100);
    misty.SetDefaultVolume(100);
}
robotHomePosition();

// Global variables to track audio recording and playback status 
function initiateAudioStatusTrackingVariable()
{
    misty.Set("recordingAudio", false, false);
    misty.Set("playingAudio", false, false);
}
initiateAudioStatusTrackingVariable();

// ====================================================================
// ================= FOLLOW FACE / LOOK AT PERSON  ====================
// ====================================================================

function initiateFaceFollowVariables() 
{
    // Global variable to check whether Misty is searching for a face
    // or looking at a face
    misty.Set("findFace", false);

    // Global variable to store current pitch and yaw position of the head
    misty.Set("headYaw", 0.0, false);
    misty.Set("headPitch", 0.0, false);
}
initiateFaceFollowVariables();

// ====================== Reading Head Yaw and Pitch ==================

// Register listener for head yaw position from ActuatorPosition events
function registerYaw() 
{
    misty.AddReturnProperty("headYaw", "SensorId");
    misty.AddReturnProperty("headYaw", "Value");
    misty.AddPropertyTest("headYaw", "SensorId", "==", "ahy", "string");
    misty.RegisterEvent("headYaw", "ActuatorPosition", 100, true);
}
registerYaw();

// Register listener for pitch position from ActuatorPosition events
function registerPitch() 
{
    misty.AddReturnProperty("headPitch", "SensorId");
    misty.AddReturnProperty("headPitch", "Value");
    misty.AddPropertyTest("headPitch", "SensorId", "==", "ahp", "string");
    misty.RegisterEvent("headPitch", "ActuatorPosition", 100, true);
}
registerPitch();

function _headYaw(data) 
{
    misty.Set("headYaw", data.AdditionalResults[1], false);
}

function _headPitch(data) 
{
    misty.Set("headPitch", data.AdditionalResults[1], false);
}

// ============================ Calibrate =============================
// Misty moves her head as far as she can to the right, left, down,
// and up, and records the maximum reachable angles.

// This calibration is NOT mandatory every time. Run this once, and
// look at the web console in the Skill Runner page to get the min and
// max range for pitch and yaw movements for your robot. Update the
// four global variables below with these limits, and comment out the
// call on the calibrate function:
// "_ = calibrate();"

function initiateHeadPhysicalLimitVariables() 
{
    misty.Set("yawRight", -90.0, false);
    misty.Set("yawLeft", 90.0, false);
    misty.Set("pitchDown", 90.0, false);
    misty.Set("pitchUp", -90.0, false);
    misty.Pause(3000);
    return 0;
}
_ = initiateHeadPhysicalLimitVariables();

function calibrate() {
    _ = moveHeadAndRecordPosition(0, 0, -90, "yawRight", "headYaw");
    _ = moveHeadAndRecordPosition(0, 0, 90, "yawLeft", "headYaw");
    _ = moveHeadAndRecordPosition(90, 0, 0, "pitchDown", "headPitch");
    _ = moveHeadAndRecordPosition(-90, 0, 0, "pitchUp", "headPitch");

    misty.Debug("CALIBRATION COMPLETE");
    misty.MoveHead(0, 0, 0, null, 2);

    return 0;
}

function moveHeadAndRecordPosition(pitch, roll, yaw, outputSetTo, inputFrom) {
    misty.MoveHead(pitch, roll, yaw, null, 2);
    misty.Pause(4000);
    misty.Set(outputSetTo, misty.Get(inputFrom), false);
    misty.Debug(outputSetTo + " Recorded :" + misty.Get(outputSetTo).toString());
    return 0;
}

_ = calibrate();

// ============== Face Recognition Data and Face Follow ===============

function startFaceRecognition() 
{
    misty.StopFaceRecognition();
    misty.StartFaceRecognition();
}
startFaceRecognition();

function registerFaceRec() 
{
    misty.RegisterEvent("FaceRec", "FaceRecognition", 1300, true);
    misty.RegisterTimerEvent("findFace", 6000, false);
}

function _FaceRec(data) 
{

    if (misty.Get("findFace")) 
    {
        misty.Set("findFace", false);
        misty.ChangeLED(0, 255, 0);
        misty.DisplayImage("e_Love.jpg");
    }

    const faceDetected = data.PropertyTestResults[0].PropertyParent.Label; 
    const bearing = data.PropertyTestResults[0].PropertyParent.Bearing; // -13 right and +13 left
    const elevation = data.PropertyTestResults[0].PropertyParent.Elevation; // -13 up and +13 down
    misty.Debug(faceDetected + " detected");

    const headYaw = misty.Get("headYaw");
    const headPitch = misty.Get("headPitch");
    const yawRight = misty.Get("yawRight");
    const yawLeft = misty.Get("yawLeft");
    const pitchUp = misty.Get("pitchUp");
    const pitchDown = misty.Get("pitchDown");


    if (bearing != 0 && elevation != 0) {
        misty.MoveHead(headPitch + ((pitchDown - pitchUp) / 33) * elevation, 0, headYaw + ((yawLeft - yawRight) / 66) * bearing, null, 7 / Math.abs(bearing));
    } else if (bearing != 0) {
        misty.MoveHead(null, 0, headYaw + ((yawLeft - yawRight) / 66) * bearing, null, 7 / Math.abs(bearing));
    } else {
        misty.MoveHead(headPitch + ((pitchDown - pitchUp) / 33) * elevation, 0, null, null, 5 / Math.abs(elevation));
    }

    misty.RegisterTimerEvent("findFace", 6000, false);

}
registerFaceRec();

// ========================== Lost Face / Search Mode =================
// Misty looks from side to side and attempts to find a face

function _findFace() 
{
    misty.Set("findFace", true);
    misty.ChangeLED(0, 0, 255);
    misty.DisplayImage("e_DefaultContent.jpg");
}

function _lookSidetoSide() 
{
    if (misty.Get("findFace") && !misty.Get("recordingAudio") && !misty.Get("playingAudio")) 
    {
        if (misty.Get("headYaw") > 0) misty.MoveHead(getRandomInt(-20, 0), 0, -40, null, 4);
        else misty.MoveHead(getRandomInt(-20, 0), 0, 40, null, 4);
    }
}
misty.RegisterTimerEvent("lookSidetoSide", 6500, true);

function getRandomInt(min, max) 
{
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Moves arms randomly every 8 seconds
function _armsRandom() 
{
    if (!misty.Get("recordingAudio") && !misty.Get("playingAudio")) 
    {
        misty.MoveArmDegrees("left", getRandomInt(70, 80), 20);
        misty.MoveArmDegrees("right", getRandomInt(-70, 80), 20);
    }
}
misty.RegisterTimerEvent("armsRandom", 8000, true);

// ====================== Audio Localization ==========================
// If Misty is not already looking at the person's face, we use audio
// localization data to make Misty turn and look at the person while
// speaking out the response

function registerAudioLocalisation() 
{
    misty.Set("speechSourceAngle", 0.0, false);
    misty.AddReturnProperty("sound", "DegreeOfArrivalSpeech");
    misty.RegisterEvent("sound", "SourceTrackDataMessage", 10, true);
}
registerAudioLocalisation();

function _sound(data) 
{
    // We must start recording audio to get audio localization data.
    // While recording audio, we pause Misty looking side to side so
    // that Misty can accurately localize to the speaker's voice.
    if (!misty.Get("recordingAudio")) misty.Set("recordingAudio", true, false);

    // We get the location of speech audio in 0-360 degrees w/r/t
    // Misty's head as the local frame. We use the function
    // toRobotFrame() to map this location to the robot's local frame.
    var vector = toRobotFrame(data.AdditionalResults[0]);

    // Uncomment this line to print audio localization data in the
    // web console for the Skill Runner web page.
    // misty.Debug(vector + " <-- soundIn Angle");

    misty.Set("speechSourceAngle", vector, false);
}

// Converts 0 to 360 range (CCW) to 0 to +-180 to 0 
function toRobotFrame(data) 
{
    var soundIn = data;
    if (soundIn > 180) soundIn -= 360;

    // Map audio localization data to robot's frame of reference 
    var actuateTo = misty.Get("headYaw") + (soundIn);
    actuateTo = actuateTo > 90 ? 90 : actuateTo < -90 ? -90 : actuateTo;

    return (actuateTo)
}


// ====================================================================
// ========================== CONCIERGE ===============================
// ====================================================================


// ==================== Update Auth Token =============================

// Each Google Cloud Access Token expires after ~45 minutes.
// We use this function to refresh tokens every 15 minutes.
// Feel free to change the refresh rate as you see fit!

function initiateTokenRefresh() 
{
    misty.Set("googleAuthToken", "not updated yet", false);
    _getAuthToken();
    misty.RegisterTimerEvent("getAuthToken", 60000 * 15, true);
}
initiateTokenRefresh();

function _getAuthToken() 
{
    misty.SendExternalRequest("POST", misty.Get("cloudFunctionAuthTokenURL"), null, null, null, false, false, null, "application/json", "_UpdateAuthToken");
}

function _UpdateAuthToken(data) 
{
    misty.Set("googleAuthToken", JSON.parse(data.Result.ResponseObject.Data).authToken, false);
    misty.Debug("Updated Auth Token");
}

// ====================== Detect "Hey Misty" ==========================

function initiateVoiceRecordEvent() 
{
    // VoiceRecord event messages return data about completed voice
    // recordings. 
    misty.AddReturnProperty("VoiceRecord", "Filename");
    misty.AddReturnProperty("VoiceRecord", "Success");
    misty.AddReturnProperty("VoiceRecord", "ErrorCode");
    misty.AddReturnProperty("VoiceRecord", "ErrorMessage");
    misty.RegisterEvent("VoiceRecord", "VoiceRecord", 10, true);

    // We start key phrase recognition and set voice recording to begin
    // immediately after Misty heads the wake word ("Hey, Misty")
    misty.StartKeyPhraseRecognition(true, true, 15000);
    misty.Pause(1000);
    misty.ChangeLED(255, 255, 255);
}
initiateVoiceRecordEvent();

function _VoiceRecord(data) 
{
    var filename = data.AdditionalResults[0];
    var success = data.AdditionalResults[1];
    var errorCode = data.AdditionalResults[2];
    var errorMessage = data.AdditionalResults[3];

    // If voice recording is successful, send to Dialogflow
    if (success) 
    {
        misty.Debug("Audio Recording Successful");
        misty.GetAudioFile(filename, "callDialogflow");
        if (misty.Get("findFace")) misty.MoveHead(-20, 20, null, 95);
        misty.DisplayImage("e_ContentLeft.jpg");
        misty.PlayAudio("s_SystemSuccess.wav", 100);
    }
    // Otherwise, print the error message
    else 
    {
        misty.Debug("Error: " + errorCode + ". " + errorMessage);
        misty.Set("langCodeForTTS", "en-US", false);
        misty.Set("textToSpeak", "I am sorry, could you please try again?", false);
        speakTheText();
    }

    misty.Set("recordingAudio", false, false);
}

// =============== Send Voice Recording to Dialogflow =================

function callDialogflow(data) 
{
    misty.Debug("Audio being sent to Dialogue Flow")
    misty.Debug(JSON.stringify(data));
    var base64 = data.Result.Base64;

    // Parameters to send with request to Dialogflow agent.
    // For more information see the Dialogflow developer documentation:
    // https://cloud.google.com/dialogflow/docs/reference/rest/v2/projects.agent.sessions/detectIntent
    var arguments = JSON.stringify({
        "queryInput": {
            "audioConfig": {
                "audioEncoding": "AUDIO_ENCODING_LINEAR_16",
                "languageCode": "en-US"
            }
        },
        "inputAudio": base64,
        "outputAudioConfig": {
            "audioEncoding": "OUTPUT_AUDIO_ENCODING_LINEAR_16",
            "synthesizeSpeechConfig": {
                "speakingRate": 0.95,
                "pitch": 0,
                "volumeGainDb": 0,
                "effectsProfileId": ["handset-class-device"],
                "voice": {
                    'name': "en-US-Wavenet-F"
                }
            }
        }
    });

    misty.SendExternalRequest("POST", "https://dialogflow.googleapis.com/v2/projects/" + misty.Get("GoogleCloudProjectID") + "/agent/sessions/123456:detectIntent", "Bearer", misty.Get("googleAuthToken"), arguments, false, false, null, "application/json", "_dialogflowResponse");
}

// ================= Handle Dialogflow Response =======================
// We get the extracted data object from the voice recording and define
// Misty's response to different intents. In some cases, she speaks the
// response text out loud using Google's text-to-speech API. If the
// intent is aroundMe, we issue a request to the Foursquare Places API 

function _dialogflowResponse(data) 
{

    let response = JSON.parse(data.Result.ResponseObject.Data);
    misty.Debug("Response Parsed");
    misty.Debug(JSON.stringify(response));

    var intent = "unknown";
    try {
        intent = response.queryResult.intent.displayName;
        misty.Debug(intent + " intent was recognized");
    } catch (e) {
        misty.Debug("Intent not recognized");
    }

    // OPTIONAL: 
    // Dialogflow also returns Base64-encoded audio output of the
    // response. You can save and play this audio data instead of
    // calling Google's TTS API. Uncomment this line and use it instead
    // of the speakTheText() function:
    // misty.SaveAudio("tts.wav", response.outputAudio, true, true);

    if (intent == "name") 
    {
        misty.Set("textToSpeak", response.queryResult.fulfillmentText, false);
        speakTheText();
        // Do Something
    } 
    else if (intent == "menu") 
    {
        switch(response.queryResult.parameters.meal) {
            case "lunch": // If the user asks about lunch
                misty.Set("textToSpeak", "We are serving tuna sandwiches for lunch", false);
                speakTheText();
                break;
            case "dinner": // If the user asks about dinner
                misty.Set("textToSpeak", "We are serving pad thai for dinner", false);
                speakTheText();
                break;
            case "breakfast": // If the user asks about breakfast
                misty.Set("textToSpeak", "We are serving omelets for breakfast", false);
                speakTheText();
                break;
            default:  // If the user asks about the menu in general
                misty.Set("textToSpeak", "We are serving omelets for breakfast, tuna sandwiches for lunch, and pad thai for dinner", false);
                speakTheText();
                break;
        }
    } 
    else 
    {
        // Speaks out any text response from Dialogflow (from the
        // fulfillmentText property) returned by other intents not
        // explicitly named in the conditional blocks above.
        misty.Set("textToSpeak", "I am sorry, could you please try again?", false);

        if (intent != "Default Fallback Intent" && intent != "unknown") 
        {
            // Checks if a text response is returned by Dialogflow
            try 
            {
                let textToSpeak = response.queryResult.fulfillmentText;
                if (textToSpeak != "undefined" && textToSpeak != "") misty.Set("textToSpeak", textToSpeak, false);
            } 
            catch (error) 
            {
                misty.Debug("No text response was returned by " + intent + "  intent.");
            }
        }
        speakTheText();
    }
}

// ====================================================================
// ========================== Text To Speech ==========================
// ====================================================================

// We store the text to be converted to audio in the "textToSpeak"
// global variable, and call speakTheText() function to execute TTS

function speakTheText() 
{
    // Parameters to send with request to Google TTS API.
    // Feel free to change the pitch, speaking rate and gender.
    // For more information see the Google TTS API developer docs:
    // https://cloud.google.com/text-to-speech/docs/reference/rest/v1beta1/text/synthesize
    var arguments = JSON.stringify({
        'input': {
            'text': misty.Get("textToSpeak")
        },
        'voice': {
            'languageCode': misty.Get("langCodeForTTS"),
            'ssmlGender': "FEMALE"
        },
        'audioConfig': {
            'audioEncoding': "LINEAR16",
            "effectsProfileId": [
                "handset-class-device"
            ],
            "pitch": 0,
            "speakingRate": 0.91
        }
    });

    misty.Debug("Sending Data to Google");
    misty.SendExternalRequest("POST", "https://texttospeech.googleapis.com/v1beta1/text:synthesize", "Bearer", misty.Get("googleAuthToken"), arguments, false, false, null, "application/json", "_Base64In")
    misty.Debug("Text sent to Google Text to Speech API");
}


function _Base64In(data) 
{
    misty.Debug("Audio(base64) in from Google TTS API");
    misty.Debug(JSON.stringify(data));

    misty.Set("playingAudio", true, false);
    misty.DisplayImage("e_Joy2.jpg");

    // If Misty is not already locked on to a human face, we use audio
    // localization data to turn her head in the speaker's direction 
    var angleTolook = misty.Get("speechSourceAngle") >= 0 ? misty.Get("yawLeft") * misty.Get("speechSourceAngle") / 90 : misty.Get("yawRight") * Math.abs(misty.Get("speechSourceAngle")) / 90;
    if (misty.Get("findFace")) 
    {
        misty.MoveHead(-20, 0, angleTolook, null, 1);
        misty.MoveArmDegrees((angleTolook >= 0) ? "left" : "right", 85, 60);
        misty.MoveArmDegrees((angleTolook >= 0) ? "right" : "left", -80, 60);
    } 
    else 
    {
        misty.MoveArmDegrees((misty.Get("headYaw") >= 0) ? "left" : "right", 85, 60);
        misty.MoveArmDegrees((misty.Get("headYaw") >= 0) ? "right" : "left", -80, 60);
    }
    misty.Pause(500);

    // Saves and plays the Base64-encoded audio data 
    misty.SaveAudio("tts.wav", JSON.parse(data.Result.ResponseObject.Data).audioContent, true, true);

    // Starts Misty listening to the wake word ("Hey, Misty") again
    misty.DisplayImage("e_DefaultContent.jpg", 1.0, 3000);
    misty.StartKeyPhraseRecognition(true, true, 15000);
    misty.ChangeLED(255, 255, 255);
    misty.Pause(2000);
    misty.Set("playingAudio", false, false);
}
