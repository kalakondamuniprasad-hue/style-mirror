/* =========================================================
   STYLORA - APP.JS
   ========================================================= */


/* =========================================================
   API
   ========================================================= */

const API_BASE = "/api";
const DEMO_MODE_TOKEN = "stylemirror-demo-token";


/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
    "https://adturtkvwkaskwrrgemo.supabase.co";

/*
   IMPORTANT:
   Paste your existing Supabase PUBLISHABLE key here.

   Do NOT use a secret/service-role key.
*/

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_0DV2xEqWv6qmPFOjQNf_ww_ftFbvsZ-";


const supabaseClient =
    (typeof window !== "undefined" && window.supabase && typeof window.supabase.createClient === "function")
        ? window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY
        )
        : null;


/* =========================================================
   APPLICATION STATE
   ========================================================= */

let accessToken = null;
let currentUser = null;
let currentProfileId = null;
let currentProjectId = null;
let currentProfile = null;
let selectedMedia = "photo";

function useDemoMode(goHome = false) {
    accessToken = DEMO_MODE_TOKEN;
    currentUser = {
        id: "local-demo-user",
        email: "demo@stylemirror.local",
        name: "Demo User",
    };
    currentProfileId = null;
    if (goHome) {
        window.history.pushState({}, "", "/");
        applyWorkspaceRoute("/", false);
    }
    showApplication();
}


/* =========================================================
   ELEMENTS
   ========================================================= */

const authScreen =
    document.getElementById("authScreen");

const appContent =
    document.getElementById("appContent");

const homePage =
    document.getElementById("homePage");

const videoEditorPage =
    document.getElementById("videoEditorPage");

const photoWorkspacePreview =
    document.getElementById("photoWorkspacePreview");

const photoCanvasEmpty =
    document.getElementById("photoCanvasEmpty");

const photoCanvasFileName =
    document.getElementById("photoCanvasFileName");


const loginTab =
    document.getElementById("loginTab");

const signupTab =
    document.getElementById("signupTab");

const authTabs =
    document.querySelector(".auth-tabs");

const authSwitchText =
    document.getElementById("authSwitchText");

const authHeading =
    document.getElementById("authHeading");

const authSubtitle =
    document.getElementById("authSubtitle");

const authCreateAccountPrompt =
    document.getElementById("authCreateAccountPrompt");


const nameGroup =
    document.getElementById("nameGroup");

const nameInput =
    document.getElementById("authName");


const emailInput =
    document.getElementById("authEmail");

const passwordInput =
    document.getElementById("authPassword");


const authForm =
    document.getElementById("authForm");

const authButton =
    document.getElementById("authButton");

const authMessage =
    document.getElementById("authMessage");


const logoutButton =
    document.getElementById("logoutButton");


const referenceImage =
    document.getElementById("referenceImage");

const originalImage =
    document.getElementById("originalImage");


const referenceFileName =
    document.getElementById("referenceFileName");

const originalFileName =
    document.getElementById("originalFileName");


const generateButton =
    document.getElementById("generateButton");


const statusElement =
    document.getElementById("status");


const resultSection =
    document.getElementById("resultSection");


const originalPreview =
    document.getElementById("originalPreview");

const editedPreview =
    document.getElementById("editedPreview");


const originalEmpty =
    document.getElementById("originalEmpty");

const editedEmpty =
    document.getElementById("editedEmpty");


const regenerateButton =
    document.getElementById("regenerateButton");

const exportButton =
    document.getElementById("exportButton");


const historyContainer =
    document.getElementById("historyContainer");


/* =========================================================
   AUTH MODE
   ========================================================= */

let authMode = "login";


function showLogin() {

    authMode = "login";

    if (authTabs) {
        authTabs.dataset.selection = "login";
    }


    if (loginTab) {
        loginTab.classList.remove("active");
        loginTab.classList.add("hidden");
    }


    if (signupTab) {
        signupTab.classList.add("active");
        signupTab.classList.remove("hidden");
    }

    if (authSwitchText) authSwitchText.textContent = "Don't have an account?";
    if (authHeading) authHeading.textContent = "Welcome back";
    if (authSubtitle) authSubtitle.innerHTML = 'Log in to continue your creative journey<br class="desktop-break"> with Stylora.';
    if (authCreateAccountPrompt) authCreateAccountPrompt.hidden = false;


    if (nameGroup) {
        nameGroup.classList.add("hidden");
    }


    if (authButton) {
        authButton.innerHTML = 'Log in <span>→</span>';
    }


    if (authMessage) {
        authMessage.textContent = "";
    }

}


function showSignup() {

    authMode = "signup";

    if (authTabs) {
        authTabs.dataset.selection = "signup";
    }


    if (signupTab) {
        signupTab.classList.remove("active");
        signupTab.classList.add("hidden");
    }


    if (loginTab) {
        loginTab.classList.add("active");
        loginTab.classList.remove("hidden");
    }

    if (authSwitchText) authSwitchText.textContent = "Already have an account?";
    if (authHeading) authHeading.textContent = "Create your account";
    if (authSubtitle) authSubtitle.textContent = "Start creating with Stylora.";
    if (authCreateAccountPrompt) authCreateAccountPrompt.hidden = true;


    if (nameGroup) {
        nameGroup.classList.remove("hidden");
    }


    if (authButton) {
        authButton.innerHTML = 'Create account <span>→</span>';
    }


    if (authMessage) {
        authMessage.textContent = "";
    }

}


/* =========================================================
   AUTH TABS
   ========================================================= */

if (loginTab) {

    loginTab.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            showLogin();

        }
    );

}


if (signupTab) {

    signupTab.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            showSignup();

        }
    );

}

const signupFooterButton = document.getElementById("signupFooterButton");
if (signupFooterButton) signupFooterButton.addEventListener("click", showSignup);

const togglePasswordButton = document.getElementById("togglePassword");
if (togglePasswordButton && passwordInput) {
    togglePasswordButton.addEventListener("click", function () {
        const showingPassword = passwordInput.type === "password";
        passwordInput.type = showingPassword ? "text" : "password";
        this.setAttribute("aria-label", showingPassword ? "Hide password" : "Show password");
    });
}

const forgotPasswordButton = document.getElementById("forgotPasswordButton");
if (forgotPasswordButton) {
    forgotPasswordButton.addEventListener("click", async function () {
        const email = emailInput ? emailInput.value.trim() : "";
        if (!email) {
            authMessage.textContent = "Enter your email address and we’ll send a reset link.";
            if (emailInput) emailInput.focus();
            return;
        }
        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });
            if (error) throw error;
            authMessage.textContent = "Password reset link sent. Check your inbox.";
        } catch (error) {
            authMessage.textContent = error.message || "Password reset is unavailable right now.";
        }
    });
}

[
    ["googleAuthButton", "google"],
    ["appleAuthButton", "apple"],
].forEach(function ([buttonId, provider]) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    button.addEventListener("click", async function () {
        try {
            const { error } = await supabaseClient.auth.signInWithOAuth({
                provider,
                options: { redirectTo: window.location.origin },
            });
            if (error) throw error;
        } catch (error) {
            authMessage.textContent = error.message || `${provider} sign-in is unavailable.`;
        }
    });
});


/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function handleAuthentication(event) {

    if (event) {
        event.preventDefault();
    }


    const email =
        emailInput
            ? emailInput.value.trim()
            : "";


    const password =
        passwordInput
            ? passwordInput.value
            : "";


    const name =
        nameInput
            ? nameInput.value.trim()
            : "";


    if (!email) {

        authMessage.textContent =
            "Please enter your email.";

        return;
    }


    if (!password) {

        authMessage.textContent =
            "Please enter your password.";

        return;
    }


    if (password.length < 6) {

        authMessage.textContent =
            "Password must be at least 6 characters.";

        return;
    }


    if (authButton) {

        authButton.disabled = true;

        authButton.textContent =
            authMode === "signup"
                ? "Creating account..."
                : "Logging in...";
    }


    if (authMessage) {
        authMessage.textContent = "";
    }


    try {

        /* =====================================================
           SIGN UP
           ===================================================== */

        if (authMode === "signup") {

            if (!name) {

                throw new Error(
                    "Please enter your name."
                );

            }


            const {
                data,
                error
            } =
                await supabaseClient.auth.signUp({

                    email: email,

                    password: password,

                    options: {

                        data: {
                            name: name
                        }

                    }

                });


            if (error) {
                throw error;
            }


            console.log(
                "SIGN UP RESPONSE:",
                data
            );


            if (data.session) {

                accessToken =
                    data.session.access_token;

                currentUser =
                    data.session.user;


                await createOrLoadUserProfile();


                applyWorkspaceRoute("/", true);
                showApplication();

                return;
            }


            showLogin();


            if (emailInput) {
                emailInput.value = email;
            }


            if (passwordInput) {
                passwordInput.value = "";
            }


            if (authMessage) {

                authMessage.textContent =
                    "Account created successfully. You can now login.";

            }


            return;
        }


        /* =====================================================
           LOGIN
           ===================================================== */

        console.log(
            "Attempting Supabase login..."
        );


        const {
            data,
            error
        } =
            await supabaseClient.auth.signInWithPassword({

                email: email,

                password: password

            });


        console.log(
            "LOGIN RESPONSE:",
            data
        );


        if (error) {
            throw error;
        }


        if (!data || !data.session) {

            throw new Error(
                "Login completed but no session was returned."
            );

        }


        accessToken =
            data.session.access_token;

        currentUser =
            data.session.user;


        console.log(
            "LOGIN SUCCESS:",
            currentUser.email
        );


        await createOrLoadUserProfile();


        applyWorkspaceRoute("/", true);
        showApplication();

    }

    catch (error) {

        console.error(
            "AUTHENTICATION ERROR:",
            error
        );


        if (authMessage) {

            authMessage.textContent =
                error.message ||
                "Login failed.";

        }

    }

    finally {

        if (authButton) {

            authButton.disabled = false;

            authButton.textContent =
                authMode === "signup"
                    ? "Create account →"
                    : "Log in →";

        }

    }

}


/* =========================================================
   AUTH BUTTON
   ========================================================= */

const demoLoginButton = document.getElementById("demoLoginButton");

document.querySelectorAll(".auth-button, .demo-button, .hero-button").forEach(function (button) {
    button.addEventListener("pointerenter", function (event) {
        const bounds = button.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        const farthestCorner = Math.max(
            Math.hypot(x, y),
            Math.hypot(bounds.width - x, y),
            Math.hypot(x, bounds.height - y),
            Math.hypot(bounds.width - x, bounds.height - y)
        );

        button.style.setProperty("--radial-reveal-x", `${x}px`);
        button.style.setProperty("--radial-reveal-y", `${y}px`);
        button.style.setProperty("--radial-reveal-radius", `${farthestCorner}px`);
    });

    button.addEventListener("pointerleave", function () {
        button.style.setProperty("--radial-reveal-radius", "0px");
    });
});

if (demoLoginButton) {
    demoLoginButton.addEventListener("click", function () {
        useDemoMode(true);
    });
}

if (authButton) {

    authButton.type = "button";


    authButton.addEventListener(
        "click",
        handleAuthentication
    );

}

if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
) {
    useDemoMode();
}


if (authForm) {

    authForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

        }
    );

}


/* =========================================================
   LOGOUT
   ========================================================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function () {

            try {

                await supabaseClient.auth.signOut();

            }

            catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

            }


            accessToken = null;

            currentUser = null;

            currentProfileId = null;

            currentProjectId = null;

            currentProfile = null;


            if (appContent) {
                appContent.classList.add("hidden");
            }


            if (authScreen) {
                authScreen.classList.remove("hidden");
            }


            showLogin();

        }
    );

}


/* =========================================================
/* =========================================================
   SUPABASE AUTH STATE
   ========================================================= */

if (supabaseClient && supabaseClient.auth) {
    supabaseClient.auth.onAuthStateChange(
        function (event, session) {

            console.log(
                "AUTH STATE:",
                event
            );


            if (session) {

                accessToken =
                    session.access_token;

                currentUser =
                    session.user;

            }

            else {

                accessToken = null;

                currentUser = null;

            }

        }
    );
}


/* =========================================================
   USER PROFILE
   ========================================================= */

async function createOrLoadUserProfile() {

    if (!accessToken) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/users/`,
                {

                    method: "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${accessToken}`,

                        "Content-Type":
                            "application/json"

                    }

                }
            );


        if (!response.ok) {

            const text =
                await response.text();

            console.error(
                "User profile request failed:",
                text
            );

            return;
        }


        const data =
            await response.json();


        console.log(
            "USER PROFILE:",
            data
        );


        if (
            Array.isArray(data) &&
            data.length > 0
        ) {

            currentProfileId =
                data[0].id;

        }

        else if (
            data.results &&
            data.results.length > 0
        ) {

            currentProfileId =
                data.results[0].id;

        }

    }

    catch (error) {

        console.error(
            "Profile loading error:",
            error
        );

    }

}


/* =========================================================
   SHOW APPLICATION
   ========================================================= */

function showApplication() {

    console.log(
        "Opening Stylora..."
    );


    if (authScreen) {
        authScreen.classList.add("hidden");
    }


    if (appContent) {
        appContent.classList.remove("hidden");
    }

    const savedDemoName = accessToken === DEMO_MODE_TOKEN
        ? localStorage.getItem("styleMirror.profileName")
        : "";
    const displayName = savedDemoName ||
        currentUser?.user_metadata?.name ||
        currentUser?.name ||
        currentUser?.email?.split("@")[0] ||
        "Creator";
    const email = currentUser?.email || "";
    const initials = displayName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(function (part) { return part.charAt(0); })
        .join("")
        .toUpperCase() || "SM";
    const dashboardUserName = document.getElementById("dashboardUserName");
    const dashboardGreetingName = document.getElementById("dashboardGreetingName");
    const dashboardAvatar = document.querySelector(".dashboard-avatar");
    const profileDisplayName = document.getElementById("profileDisplayName");
    const profileSummaryEmail = document.getElementById("profileSummaryEmail");
    const profileNameInput = document.getElementById("profileNameInput");
    const profileEmailInput = document.getElementById("profileEmailInput");
    const profileAvatar = document.getElementById("profileAvatar");
    if (dashboardUserName) dashboardUserName.textContent = displayName;
    if (dashboardGreetingName) dashboardGreetingName.textContent = displayName.toUpperCase();
    if (dashboardAvatar) dashboardAvatar.textContent = initials;
    if (profileDisplayName) profileDisplayName.textContent = displayName;
    if (profileSummaryEmail) profileSummaryEmail.textContent = email || "No email available";
    if (profileNameInput) profileNameInput.value = displayName;
    if (profileEmailInput) profileEmailInput.value = email;
    if (profileAvatar) profileAvatar.textContent = initials;

    loadHistory();

}

const profileForm = document.getElementById("profileForm");
if (profileForm) {
    profileForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const nameInput = document.getElementById("profileNameInput");
        const status = document.getElementById("profileSaveMessage");
        const saveButton = profileForm.querySelector('button[type="submit"]');
        const displayName = nameInput.value.trim();
        if (!displayName) {
            status.textContent = "Enter a display name before saving.";
            status.dataset.state = "error";
            nameInput.focus();
            return;
        }

        status.textContent = "";
        delete status.dataset.state;
        saveButton.disabled = true;
        try {
            if (accessToken === DEMO_MODE_TOKEN) {
                localStorage.setItem("styleMirror.profileName", displayName);
                currentUser.name = displayName;
            } else {
                const { data, error } = await supabaseClient.auth.updateUser({
                    data: { name: displayName },
                });
                if (error) throw error;
                if (!data.user) throw new Error("The profile update returned no user.");
                currentUser = data.user;
            }

            showApplication();
            status.textContent = "Profile updated.";
        } catch (error) {
            console.error("Profile update failed:", error);
            status.textContent = error.message || "Could not save your profile. Please try again.";
            status.dataset.state = "error";
        } finally {
            saveButton.disabled = false;
        }
    });
}


/* =========================================================
   FILE NAME DISPLAY
   ========================================================= */

if (referenceImage) {

    referenceImage.addEventListener(
        "change",
        function () {

            if (
                referenceImage.files &&
                referenceImage.files.length > 0
            ) {

                referenceFileName.textContent =
                    referenceImage.files[0].name;

            }

        }
    );

}


if (originalImage) {

    originalImage.addEventListener(
        "change",
        function () {

            if (
                originalImage.files &&
                originalImage.files.length > 0
            ) {

                originalFileName.textContent =
                    originalImage.files[0].name;

            }

        }
    );

}

[
    ["referenceVideo", "referenceVideoFileName"],
    ["originalVideo", "originalVideoFileName"],
].forEach(function ([inputId, fileNameId]) {
    const videoInput = document.getElementById(inputId);
    const fileName = document.getElementById(fileNameId);

    if (videoInput && fileName) {
        videoInput.addEventListener("change", function () {
            fileName.textContent = videoInput.files.length
                ? videoInput.files[0].name
                : "No video selected";
        });
    }
});


/* =========================================================
   API HELPER
   ========================================================= */

async function apiRequest(
    url,
    options = {}
) {

    options.headers =
        options.headers || {};


    if (accessToken) {

        options.headers["Authorization"] =
            `Bearer ${accessToken}`;

    }


    const response =
        await fetch(
            url,
            options
        );


    if (!response.ok) {

        const text =
            await response.text();


        console.error(
            "API ERROR:",
            response.status,
            url,
            text
        );


        throw new Error(
            `Request failed: ${response.status}`
        );

    }


    return response.json();

}


/* =========================================================
   GENERATE STYLE
   ========================================================= */

if (generateButton) {

    generateButton.addEventListener(
        "click",
        async function () {

            if (!accessToken) {

                setStatus(
                    "Please login first."
                );

                return;

            }

            if (selectedMedia === "video") {
                setStatus("Video editing is coming soon. Switch to Photo to generate a style.");
                return;
            }


            if (
                !referenceImage ||
                !referenceImage.files.length
            ) {

                setStatus(
                    "Please select a reference image."
                );

                return;

            }


            if (
                !originalImage ||
                !originalImage.files.length
            ) {

                setStatus(
                    "Please select your original image."
                );

                return;

            }


            try {

                generateButton.disabled = true;


                /* =================================================
                   STEP 1 - GENERATE STYLE PROFILE
                   ================================================= */

                setStatus(
                    "Analyzing your reference image..."
                );


                const styleForm =
                    new FormData();


                styleForm.append(
                    "image",
                    referenceImage.files[0]
                );


                console.log(
                    "Calling:",
                    `${API_BASE}/generate-style-profile/`
                );


                const styleResponse =
                    await apiRequest(
                        `${API_BASE}/generate-style-profile/`,
                        {

                            method: "POST",

                            body: styleForm

                        }
                    );


                console.log(
                    "STYLE PROFILE RESPONSE:",
                    styleResponse
                );


                currentProfileId =
                    styleResponse.profile_id;


                currentProfile =
                    styleResponse.style;


                if (!currentProfileId) {

                    throw new Error(
                        "Style profile was not created."
                    );

                }


                /* =================================================
                   STEP 2 - UPLOAD ORIGINAL IMAGE
                   ================================================= */

                setStatus(
                    "Uploading your original image..."
                );


                const uploadForm =
                    new FormData();


                uploadForm.append(
                    "image",
                    originalImage.files[0]
                );


                uploadForm.append(
                    "image_type",
                    "original"
                );


                console.log(
                    "Calling:",
                    `${API_BASE}/uploaded-images/`
                );


                const uploadResponse =
                    await apiRequest(
                        `${API_BASE}/uploaded-images/`,
                        {

                            method: "POST",

                            body: uploadForm

                        }
                    );


                console.log(
                    "UPLOAD RESPONSE:",
                    uploadResponse
                );


                if (!uploadResponse.image) {

                    throw new Error(
                        "Original image upload failed."
                    );

                }


                /* =================================================
                   STEP 3 - CREATE PROJECT
                   ================================================= */

                setStatus(
                    "Creating your editing project..."
                );


                const projectResponse =
                    await apiRequest(
                        `${API_BASE}/projects/`,
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    name:
                                        "Stylora Project",

                                    original_image_url:
                                        getAbsoluteUrl(
                                            uploadResponse.image
                                        ),

                                    editing_profile:
                                        currentProfileId

                                })

                        }
                    );


                console.log(
                    "PROJECT RESPONSE:",
                    projectResponse
                );


                currentProjectId =
                    projectResponse.id;


                if (!currentProjectId) {

                    throw new Error(
                        "Project was not created."
                    );

                }


                /* =================================================
                   STEP 4 - APPLY STYLE
                   ================================================= */

                setStatus(
                    "Applying the reference style..."
                );


                console.log(
                    "Calling:",
                    `${API_BASE}/apply-style/`
                );


                const applyResponse =
                    await apiRequest(
                        `${API_BASE}/apply-style/`,
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    profile_id:
                                        currentProfileId,

                                    project_id:
                                        currentProjectId

                                })

                        }
                    );


                console.log(
                    "APPLY STYLE RESPONSE:",
                    applyResponse
                );


                if (
                    !applyResponse.edited_image_url
                ) {

                    throw new Error(
                        "Edited image was not generated."
                    );

                }


                /* =================================================
                   STEP 5 - SHOW RESULT
                   ================================================= */

                showResult(
                    applyResponse.edited_image_url
                );


                showStyleParameters(
                    currentProfile
                );


                setStatus(
                    "Your Stylora edit is ready!"
                );


                loadHistory();

            }

            catch (error) {

                console.error(
                    "GENERATE ERROR:",
                    error
                );


                setStatus(
                    "Generating failed: " +
                    error.message
                );

            }

            finally {

                generateButton.disabled =
                    false;

            }

        }
    );

}


/* =========================================================
   SHOW RESULT
   ========================================================= */

function showResult(url) {

    if (!resultSection) {
        return;
    }


    resultSection.classList.remove(
        "hidden"
    );


    if (
        originalPreview &&
        originalImage &&
        originalImage.files.length
    ) {

        originalPreview.src =
            URL.createObjectURL(
                originalImage.files[0]
            );


        originalPreview.classList.remove(
            "hidden"
        );

    }


    if (originalEmpty) {

        originalEmpty.classList.add(
            "hidden"
        );

    }


    if (editedPreview) {

        editedPreview.src =
            getAbsoluteUrl(url);


        editedPreview.classList.remove(
            "hidden"
        );

        if (photoWorkspacePreview) {
            photoWorkspacePreview.src = getAbsoluteUrl(url);
            photoWorkspacePreview.hidden = false;
            photoCanvasEmpty.hidden = true;
            document.getElementById("photoAfterChip").hidden = false;
        }

    }


    if (editedEmpty) {

        editedEmpty.classList.add(
            "hidden"
        );

    }

}


/* =========================================================
   STYLE PARAMETERS
   ========================================================= */

function showStyleParameters(style) {

    if (!style) {
        return;
    }


    console.log(
        "STYLE PARAMETERS:",
        style
    );


    const actualStyle =
        style.style || style;


    setValue(
        "lightness",
        actualStyle.lightness
    );


    setValue(
        "contrast",
        actualStyle.contrast
    );


    setValue(
        "warmth",
        actualStyle.warmth
    );


    setValue(
        "saturation",
        actualStyle.saturation
    );


    setValue(
        "highlight",
        actualStyle.highlight
    );


    setValue(
        "shadow",
        actualStyle.shadow
    );

}


/* =========================================================
   SET STYLE VALUE
   ========================================================= */

function setValue(id, value) {

    const element =
        document.getElementById(id);


    if (!element) {

        console.warn(
            "Style value element not found:",
            id
        );

        return;

    }


    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        element.textContent = "—";

        return;

    }


    const numberValue =
        Number(value);


    if (
        Number.isFinite(numberValue)
    ) {

        element.textContent =
            Number.isInteger(numberValue)
                ? String(numberValue)
                : numberValue.toFixed(2);

    }

    else {

        element.textContent =
            String(value);

    }

}


/* =========================================================
   REGENERATE
   ========================================================= */

if (regenerateButton) {

    regenerateButton.addEventListener(
        "click",
        async function () {

            if (!currentProjectId) {

                setStatus(
                    "No project is available."
                );

                return;

            }


            try {

                regenerateButton.disabled =
                    true;


                setStatus(
                    "Regenerating your image..."
                );


                const response =
                    await apiRequest(
                        `${API_BASE}/projects/${currentProjectId}/regenerate/`,
                        {

                            method: "POST"

                        }
                    );


                console.log(
                    "REGENERATE RESPONSE:",
                    response
                );


                showResult(
                    response.image_url
                );


                setStatus(
                    "Regeneration complete!"
                );


                loadHistory();

            }

            catch (error) {

                console.error(
                    "Regeneration error:",
                    error
                );


                setStatus(
                    "Regeneration failed: " +
                    error.message
                );

            }

            finally {

                regenerateButton.disabled =
                    false;

            }

        }
    );

}


/* =========================================================
   EXPORT
   ========================================================= */

if (exportButton) {

    exportButton.addEventListener(
        "click",
        async function () {

            if (!currentProjectId) {

                setStatus(
                    "No project is available."
                );

                return;

            }


            try {

                exportButton.disabled =
                    true;


                setStatus(
                    "Exporting your image..."
                );


                const imageUrl =
                    editedPreview
                        ? editedPreview.src
                        : "";


                const response =
                    await apiRequest(
                        `${API_BASE}/exports/`,
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    project:
                                        currentProjectId,

                                    file_url:
                                        imageUrl,

                                    file_type:
                                        "jpg"

                                })

                        }
                    );


                console.log(
                    "EXPORT RESPONSE:",
                    response
                );


                const exportedUrl =
                    getAbsoluteUrl(
                        response.file_url
                    );


                setStatus(
                    "Image exported successfully!"
                );


                /*
                   Try to download the image instead
                   of opening it in a new tab.
                */

                try {

                    const imageResponse =
                        await fetch(
                            exportedUrl
                        );


                    if (!imageResponse.ok) {

                        throw new Error(
                            "Image download failed."
                        );

                    }


                    const imageBlob =
                        await imageResponse.blob();


                    const downloadUrl =
                        URL.createObjectURL(
                            imageBlob
                        );


                    const downloadLink =
                        document.createElement(
                            "a"
                        );


                    downloadLink.href =
                        downloadUrl;


                    downloadLink.download =
                        "stylora-edited-image.jpg";


                    downloadLink.style.display =
                        "none";


                    document.body.appendChild(
                        downloadLink
                    );


                    downloadLink.click();


                    document.body.removeChild(
                        downloadLink
                    );


                    setTimeout(
                        function () {

                            URL.revokeObjectURL(
                                downloadUrl
                            );

                        },
                        2000
                    );


                    setStatus(
                        "Image saved successfully!"
                    );

                }

                catch (downloadError) {

                    console.error(
                        "Download error:",
                        downloadError
                    );


                    /*
                       On phones, use the Share/Save sheet
                       when browser download is blocked.
                    */

                    if (
                        navigator.share &&
                        typeof File !== "undefined"
                    ) {

                        try {

                            const imageResponse =
                                await fetch(
                                    exportedUrl
                                );


                            const imageBlob =
                                await imageResponse.blob();


                            const imageFile =
                                new File(
                                    [imageBlob],
                                    "stylora-edited-image.jpg",
                                    {
                                        type:
                                            imageBlob.type ||
                                            "image/jpeg"
                                    }
                                );


                            if (
                                navigator.canShare &&
                                navigator.canShare({
                                    files: [imageFile]
                                })
                            ) {

                                await navigator.share({

                                    title:
                                        "Stylora",

                                    text:
                                        "Edited image from Stylora",

                                    files:
                                        [imageFile]

                                });


                                setStatus(
                                    "Image ready to save/share!"
                                );

                            }

                            else {

                                setStatus(
                                    "Please use the browser download option."
                                );

                            }

                        }

                        catch (shareError) {

                            console.error(
                                "Share error:",
                                shareError
                            );


                            setStatus(
                                "Please open the exported image and save it."
                            );

                        }

                    }

                    else {

                        setStatus(
                            "Please open the exported image and save it."
                        );

                    }

                }

            }

            catch (error) {

                console.error(
                    "Export error:",
                    error
                );


                setStatus(
                    "Export failed: " +
                    error.message
                );

            }

            finally {

                exportButton.disabled =
                    false;

            }

        }
    );

}


/* =========================================================
   HISTORY
   ========================================================= */

async function loadHistory() {

    if (!accessToken) {
        return;
    }


    if (!historyContainer) {
        return;
    }


    try {

        const response =
            await apiRequest(
                `${API_BASE}/history/`
            );


        const projects =
            response.history || response.projects || [];


        if (!projects.length) {

            historyContainer.innerHTML =
                "<p>No editing history yet.</p>";

            renderDashboardHistory([]);
            return;

        }


        historyContainer.innerHTML =
            "";


        projects.forEach(
            function (project) {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "history-item";


                const title =
                    document.createElement(
                        "h3"
                    );


                title.textContent =
                    project.project_name ||
                    project.name ||
                    "Stylora Project";


                item.appendChild(
                    title
                );


                if (
                    project.edited_image_url
                ) {

                    const image =
                        document.createElement(
                            "img"
                        );


                    image.src =
                        getAbsoluteUrl(
                            project.edited_image_url
                        );


                    image.alt =
                        "Edited image";


                    item.appendChild(
                        image
                    );

                }


                historyContainer.appendChild(
                    item
                );

            }
        );

        renderDashboardHistory(projects);

    }

    catch (error) {

        console.error(
            "History error:",
            error
        );

    }

}


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(message) {

    if (statusElement) {

        statusElement.textContent =
            message;

    }

}


/* =========================================================
   URL HELPER
   ========================================================= */

function getAbsoluteUrl(url) {

    if (!url) {
        return "";
    }


    if (
        url.startsWith("http://") ||
        url.startsWith("https://")
    ) {

        return url;

    }


    return (
        window.location.origin +
        (
            url.startsWith("/")
                ? url
                : "/" + url
        )
    );

}


/* =========================================================
   EXISTING SESSION
   ========================================================= */

async function checkExistingSession() {
    if (!supabaseClient || !supabaseClient.auth) {
        return;
    }

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.getSession();


        if (error) {
            throw error;
        }


        console.log(
            "EXISTING SESSION:",
            data.session
        );


        if (data.session) {

            accessToken =
                data.session.access_token;

            currentUser =
                data.session.user;


            await createOrLoadUserProfile();


            showApplication();

        }

        else {

            if (authScreen) {

                authScreen.classList.remove(
                    "hidden"
                );

            }


            if (appContent) {

                appContent.classList.add(
                    "hidden"
                );

            }


            showLogin();

        }

    }

    catch (error) {

        console.error(
            "Session error:",
            error
        );


        if (authScreen) {

            authScreen.classList.remove(
                "hidden"
            );

        }


        if (appContent) {

            appContent.classList.add(
                "hidden"
            );

        }

    }

}


/* =========================================================
   START APPLICATION
   ========================================================= */

const PHOTO_PROJECT_KEY = "styleMirror.photoProjectName";
const VIDEO_PROJECT_KEY = "styleMirror.videoProjectName";
const LAST_MODE_KEY = "styleMirror.lastMode";
let routeAnimationTimer = null;
let aiModeAnimationTimer = null;

function applyWorkspaceRoute(path, pushHistory) {
    const normalizedPath = path.replace(/\/$/, "") || "/";
    const route = ["/photo-editor", "/video-editor", "/photo-restyle", "/video-restyle", "/profile"].includes(normalizedPath)
        ? normalizedPath
        : "/";
    const selectedMode = route === "/video-editor" || route === "/video-restyle"
        ? "video"
        : route === "/photo-editor" || route === "/photo-restyle"
            ? "photo"
            : localStorage.getItem(LAST_MODE_KEY) || "photo";

    if (pushHistory && window.location.pathname !== route) {
        window.history.pushState({ styleMirrorRoute: route }, "", route);
    }

    if (route !== "/") {
        localStorage.setItem(LAST_MODE_KEY, selectedMode);
    }

    document.body.dataset.editorMode = selectedMode;
    homePage.hidden = route !== "/";
    document.getElementById("profilePage").hidden = route !== "/profile";
    document.getElementById("editor").hidden = route !== "/photo-editor";
    videoEditorPage.hidden = route !== "/video-editor";
    document.getElementById("photoRestylePage").hidden = route !== "/photo-restyle";
    document.getElementById("videoRestylePage").hidden = route !== "/video-restyle";

    document.querySelectorAll(".home-only").forEach(function (element) {
        element.hidden = route !== "/";
    });

    document.querySelectorAll(".nav-links [data-app-route]").forEach(function (link) {
        const href = link.getAttribute("href");
        if (href === route || (selectedMode === "photo" && href === "/photo-editor" && route === "/photo-restyle") || (selectedMode === "video" && href === "/video-editor" && route === "/video-restyle")) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });

    document.body.dataset.appRoute = route;
    document.querySelectorAll(".home-mode-card").forEach(function (card) {
        card.classList.toggle("selected", card.dataset.mediaMode === selectedMode);
    });

    const activePage = route === "/profile"
        ? document.getElementById("profilePage")
        : route === "/video-editor"
            ? videoEditorPage
            : route === "/photo-editor"
                ? document.getElementById("editor")
                : route === "/photo-restyle"
                    ? document.getElementById("photoRestylePage")
                    : route === "/video-restyle"
                        ? document.getElementById("videoRestylePage")
                        : homePage;

    document.querySelectorAll(".ai-mode-switch").forEach(function (switcher) {
        switcher.classList.remove("is-animating");
    });

    if (activePage) {
        const aiModeSwitch = activePage.querySelector(".ai-mode-switch");
        if (aiModeSwitch) {
            aiModeSwitch.dataset.selection = route.endsWith("restyle") ? "restyle" : "edit";
            void aiModeSwitch.offsetWidth;
            aiModeSwitch.classList.add("is-animating");
            window.clearTimeout(aiModeAnimationTimer);
            aiModeAnimationTimer = window.setTimeout(function () {
                aiModeSwitch.classList.remove("is-animating");
            }, 720);
        }

        activePage.classList.remove("page-entering");
        void activePage.offsetWidth;
        activePage.classList.add("page-entering");
        window.clearTimeout(routeAnimationTimer);
        routeAnimationTimer = window.setTimeout(function () {
            activePage.classList.remove("page-entering");
        }, 320);
    }
}

document.addEventListener("click", function (event) {
    const projectAction = event.target.closest(".dashboard-project-meta button");
    if (projectAction) {
        event.preventDefault();
        event.stopPropagation();
        window.alert("Open a project card to continue editing. Project management is available in the editor history.");
        return;
    }

    const routeLink = event.target.closest("a[data-app-route]");

    if (!routeLink || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
    }

    event.preventDefault();
    applyWorkspaceRoute(routeLink.dataset.appRoute, true);
});

window.addEventListener("popstate", function () {
    applyWorkspaceRoute(window.location.pathname, false);
});

function renderDashboardHistory(projects) {
    const count = projects.length;
    const regenerationCount = projects.reduce(function (total, project) {
        return total + (Array.isArray(project.regenerations) ? project.regenerations.length : 0);
    }, 0);
    const restyleCount = projects.filter(function (project) {
        return Boolean(project.editing_profile);
    }).length;

    const projectCount = document.getElementById("dashboardProjectCount");
    const editCount = document.getElementById("dashboardEditCount");
    const restyleCountElement = document.getElementById("dashboardRestyleCount");
    if (projectCount) projectCount.textContent = String(count);
    if (editCount) editCount.textContent = String(regenerationCount);
    if (restyleCountElement) restyleCountElement.textContent = String(restyleCount);
    const profileProjectCount = document.getElementById("profileProjectCount");
    const profileEditCount = document.getElementById("profileEditCount");
    const profileRestyleCount = document.getElementById("profileRestyleCount");
    if (profileProjectCount) profileProjectCount.textContent = String(count);
    if (profileEditCount) profileEditCount.textContent = String(regenerationCount);
    if (profileRestyleCount) profileRestyleCount.textContent = String(restyleCount);

    const recentProjects = document.getElementById("dashboardRecentProjects");
    if (!recentProjects || !count) return;

    const fallbackImages = [
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=480&q=75",
        "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=480&q=75",
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=480&q=75",
        "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=480&q=75",
    ];
    recentProjects.replaceChildren();
    projects.slice(0, 8).forEach(function (project, index) {
        const card = document.createElement("a");
        card.className = "dashboard-project-card";
        card.href = "/photo-editor";
        card.dataset.appRoute = "/photo-editor";
        card.dataset.searchable = `${project.project_name || project.name || ""} photo edit`;

        const imageFrame = document.createElement("div");
        imageFrame.className = "dashboard-project-image";
        const image = document.createElement("img");
        image.src = project.edited_image_url || project.original_image_url || fallbackImages[index % fallbackImages.length];
        image.alt = project.project_name || project.name || "Saved Stylora project";
        image.loading = "lazy";
        imageFrame.appendChild(image);

        const meta = document.createElement("div");
        meta.className = "dashboard-project-meta";
        const kind = document.createElement("span");
        kind.textContent = project.editing_profile ? "✧ Restyle" : "▧ Photo Edit";
        const menuButton = document.createElement("button");
        menuButton.type = "button";
        menuButton.setAttribute("aria-label", `Actions for ${project.project_name || project.name || "project"}`);
        menuButton.textContent = "⋮";
        meta.append(kind, menuButton);

        const title = document.createElement("strong");
        title.textContent = project.project_name || project.name || "Stylora Project";
        const subtitle = document.createElement("small");
        subtitle.textContent = project.created_at
            ? new Date(project.created_at).toLocaleDateString()
            : "Saved project";
        card.append(imageFrame, meta, title, subtitle);
        recentProjects.appendChild(card);
    });
    filterDashboardSearch();
}

function filterDashboardSearch() {
    const search = document.getElementById("dashboardSearch");
    if (!search) return;
    const query = search.value.trim().toLowerCase();
    let visibleCount = 0;
    document.querySelectorAll("#dashboardRecentProjects [data-searchable], .dashboard-feature-card[data-searchable]").forEach(function (card) {
        const matches = !query || card.dataset.searchable.toLowerCase().includes(query);
        card.hidden = !matches;
        if (matches) visibleCount += 1;
    });
    const emptyState = document.getElementById("dashboardSearchEmpty");
    if (emptyState) emptyState.hidden = !query || visibleCount > 0;
}

function initializeDashboardControls() {
    const search = document.getElementById("dashboardSearch");
    if (search) {
        search.addEventListener("input", filterDashboardSearch);
        search.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                search.value = "";
                filterDashboardSearch();
                search.blur();
            }
        });
    }

    document.addEventListener("keydown", function (event) {
        const searchInput = document.getElementById("dashboardSearch");
        const target = event.target;
        const isTyping = target instanceof HTMLElement &&
            (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
        if (event.key === "/" && !isTyping && searchInput) {
            event.preventDefault();
            searchInput.focus();
        }
    });

    const notificationButton = document.getElementById("dashboardNotifications");
    const notificationPopover = document.getElementById("dashboardNotificationPopover");
    if (notificationButton && notificationPopover) {
        notificationButton.addEventListener("click", function () {
            const isExpanded = notificationButton.getAttribute("aria-expanded") === "true";
            notificationButton.setAttribute("aria-expanded", String(!isExpanded));
            notificationPopover.hidden = isExpanded;
        });
    }

    filterDashboardSearch();
}

const photoProjectName = document.getElementById("photoProjectName");
const videoProjectName = document.getElementById("videoProjectName");

if (photoProjectName) {
    photoProjectName.value = localStorage.getItem(PHOTO_PROJECT_KEY) || photoProjectName.value;
    photoProjectName.addEventListener("input", function () {
        localStorage.setItem(PHOTO_PROJECT_KEY, photoProjectName.value);
    });
}

if (videoProjectName) {
    videoProjectName.value = localStorage.getItem(VIDEO_PROJECT_KEY) || videoProjectName.value;
    videoProjectName.addEventListener("input", function () {
        localStorage.setItem(VIDEO_PROJECT_KEY, videoProjectName.value);
    });
}

const photoAdjustmentIds = [
    "photoExposure",
    "photoContrast",
    "photoHighlights",
    "photoShadows",
    "photoSaturation",
    "photoWarmth",
];
let photoHistory = [photoAdjustmentIds.map(function () { return 0; })];
let photoHistoryIndex = 0;

function applyPhotoAdjustments() {
    const values = Object.fromEntries(photoAdjustmentIds.map(function (id) {
        return [id, Number(document.getElementById(id).value)];
    }));
    const brightness = Math.max(35, Math.min(165, 100 + values.photoExposure * 1.2 + values.photoShadows * 0.28));
    const contrast = Math.max(40, Math.min(160, 100 + values.photoContrast * 0.85 + values.photoHighlights * 0.2));
    const saturation = Math.max(0, Math.min(200, 100 + values.photoSaturation));
    const warmth = Math.max(0, values.photoWarmth) / 100;
    const coolShift = Math.min(10, Math.max(0, -values.photoWarmth) * 0.08);
    const filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${warmth}) hue-rotate(${-coolShift}deg)`;

    if (photoWorkspacePreview) photoWorkspacePreview.style.filter = filter;

    photoAdjustmentIds.forEach(function (id) {
        const output = document.getElementById(`${id}Value`);
        if (output) output.value = `${values[id] > 0 ? "+" : ""}${values[id]}`;
    });
}

function savePhotoHistory() {
    const snapshot = photoAdjustmentIds.map(function (id) {
        return Number(document.getElementById(id).value);
    });

    if (JSON.stringify(snapshot) === JSON.stringify(photoHistory[photoHistoryIndex])) return;

    photoHistory = photoHistory.slice(0, photoHistoryIndex + 1);
    photoHistory.push(snapshot);
    photoHistoryIndex = photoHistory.length - 1;
    updatePhotoHistoryButtons();
}

function updatePhotoHistoryButtons() {
    document.getElementById("photoUndoButton").disabled = photoHistoryIndex <= 0;
    document.getElementById("photoRedoButton").disabled = photoHistoryIndex >= photoHistory.length - 1;
}

function restorePhotoHistory(index) {
    photoHistoryIndex = Math.max(0, Math.min(photoHistory.length - 1, index));
    photoAdjustmentIds.forEach(function (id, itemIndex) {
        document.getElementById(id).value = photoHistory[photoHistoryIndex][itemIndex];
    });
    applyPhotoAdjustments();
    updatePhotoHistoryButtons();
}

photoAdjustmentIds.forEach(function (id) {
    const input = document.getElementById(id);
    input.addEventListener("input", applyPhotoAdjustments);
    input.addEventListener("change", savePhotoHistory);
});

document.getElementById("photoUndoButton").addEventListener("click", function () {
    restorePhotoHistory(photoHistoryIndex - 1);
});
document.getElementById("photoRedoButton").addEventListener("click", function () {
    restorePhotoHistory(photoHistoryIndex + 1);
});

if (originalImage) {
    originalImage.addEventListener("change", function () {
        const file = originalImage.files && originalImage.files[0];
        if (!file) return;
        photoWorkspacePreview.src = URL.createObjectURL(file);
        photoWorkspacePreview.hidden = false;
        photoCanvasEmpty.hidden = true;
        document.getElementById("photoAfterChip").hidden = true;
        photoCanvasFileName.textContent = file.name;
        document.getElementById("photoFilmstripStatus").textContent = file.name;
        applyPhotoAdjustments();
    });
}

document.querySelectorAll("[data-photo-panel]").forEach(function (tab) {
    tab.addEventListener("click", function () {
        document.querySelectorAll("[data-photo-panel]").forEach(function (item) {
            item.classList.toggle("active", item === tab);
        });
        document.querySelectorAll("[data-photo-panel-content]").forEach(function (panel) {
            panel.hidden = panel.dataset.photoPanelContent !== tab.dataset.photoPanel;
        });
    });
});

document.querySelectorAll("[data-photo-preset]").forEach(function (preset) {
    preset.addEventListener("click", function () {
        const values = preset.dataset.photoPreset === "warm"
            ? [4, 8, 0, 7, 12, 18]
            : preset.dataset.photoPreset === "soft"
                ? [5, -8, -8, 12, -8, 5]
                : preset.dataset.photoPreset === "mono"
                    ? [0, 12, 0, 0, -100, 0]
                    : [0, 0, 0, 0, 0, 0];
        photoAdjustmentIds.forEach(function (id, index) {
            document.getElementById(id).value = values[index];
        });
        document.querySelectorAll("[data-photo-preset]").forEach(function (item) {
            item.classList.toggle("active", item === preset);
        });
        applyPhotoAdjustments();
        savePhotoHistory();
    });
});

document.querySelectorAll("[data-photo-tool]").forEach(function (tool) {
    tool.addEventListener("click", function () {
        const label = tool.dataset.photoTool;
        document.getElementById("photoToolStatus").textContent = `${label[0].toUpperCase()}${label.slice(1)} tools selected for this photo.`;
        document.querySelectorAll("[data-photo-tool]").forEach(function (item) {
            item.classList.toggle("active", item === tool);
        });
    });
});

document.getElementById("photoAiEditButton").addEventListener("click", function () {
    generateButton.click();
});

document.getElementById("photoTopExportButton").addEventListener("click", async function () {
    const file = originalImage && originalImage.files && originalImage.files[0];
    if (!file) {
        document.getElementById("photoToolStatus").textContent = "Upload a photo before exporting.";
        return;
    }
    if (resultSection && !resultSection.classList.contains("hidden") && editedPreview.src) {
        const link = document.createElement("a");
        link.href = editedPreview.src;
        link.download = `${photoProjectName.value || "stylora-photo"}-edited.png`;
        link.click();
        return;
    }
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    context.filter = getComputedStyle(photoWorkspacePreview).filter;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    canvas.toBlob(function (blob) {
        if (!blob) return;
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${photoProjectName.value || "stylora-photo"}.png`;
        link.click();
        URL.revokeObjectURL(downloadUrl);
    }, "image/png");
});

document.querySelectorAll("[data-video-panel]").forEach(function (tab) {
    tab.addEventListener("click", function () {
        document.querySelectorAll("[data-video-panel]").forEach(function (item) {
            item.classList.toggle("active", item === tab);
        });
        document.querySelectorAll("[data-video-panel-content]").forEach(function (panel) {
            panel.hidden = panel.dataset.videoPanelContent !== tab.dataset.videoPanel;
        });
    });
});

const videoPreview = document.getElementById("videoPreview");
const videoUpload = document.getElementById("videoUpload");
const videoAudioUpload = document.getElementById("videoAudioUpload");
const videoTimelineStatus = document.getElementById("videoTimelineStatus");
let videoObjectUrl = null;
let audioObjectUrl = null;
let videoAudio = null;
let videoSplitPoints = [];

function formatVideoTime(seconds) {
    if (!Number.isFinite(seconds)) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function updateVideoTrimLabels() {
    const start = Number(document.getElementById("videoTrimStart").value);
    const end = Number(document.getElementById("videoTrimEnd").value);
    document.getElementById("videoTrimStartValue").value = formatVideoTime(start);
    document.getElementById("videoTrimEndValue").value = formatVideoTime(end);
}

if (videoUpload) {
    videoUpload.addEventListener("change", function () {
        const file = videoUpload.files && videoUpload.files[0];
        if (!file) return;
        if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
        videoObjectUrl = URL.createObjectURL(file);
        videoPreview.src = videoObjectUrl;
        videoPreview.load();
        document.getElementById("videoEmptyState").hidden = true;
        document.getElementById("videoFileName").textContent = file.name;
        document.getElementById("videoClipTrack").innerHTML = `<div class="timeline-clip-block">${file.name}</div>`;
        document.getElementById("videoTimelineStatus").textContent = "Clip added to timeline. Trim, title, and grade it from the controls.";
        videoSplitPoints = [];
    });
}

videoPreview.addEventListener("loadedmetadata", function () {
    const duration = Math.max(0.1, videoPreview.duration || 0.1);
    const trimStart = document.getElementById("videoTrimStart");
    const trimEnd = document.getElementById("videoTrimEnd");
    trimStart.max = duration;
    trimStart.value = 0;
    trimEnd.min = 0;
    trimEnd.max = duration;
    trimEnd.value = duration;
    document.getElementById("videoDuration").textContent = formatVideoTime(duration);
    updateVideoTrimLabels();
});

videoPreview.addEventListener("timeupdate", function () {
    const duration = videoPreview.duration || 0;
    document.getElementById("videoCurrentTime").textContent = formatVideoTime(videoPreview.currentTime);
    document.getElementById("videoSeek").value = duration ? Math.round(videoPreview.currentTime / duration * 1000) : 0;
    const trimEnd = Number(document.getElementById("videoTrimEnd").value);
    const trimStart = Number(document.getElementById("videoTrimStart").value);
    if (!videoPreview.paused && videoPreview.currentTime >= trimEnd) {
        videoPreview.pause();
        videoPreview.currentTime = trimStart;
    }
    if (videoAudio && !videoPreview.paused && Math.abs(videoAudio.currentTime - videoPreview.currentTime) > 0.25) {
        videoAudio.currentTime = videoPreview.currentTime;
    }
});

document.getElementById("videoPlayButton").addEventListener("click", function () {
    if (!videoPreview.src) {
        videoTimelineStatus.textContent = "Upload a video to preview playback.";
        return;
    }
    if (videoPreview.paused) {
        const trimStart = Number(document.getElementById("videoTrimStart").value);
        const trimEnd = Number(document.getElementById("videoTrimEnd").value);
        if (videoPreview.currentTime < trimStart || videoPreview.currentTime >= trimEnd) videoPreview.currentTime = trimStart;
        videoPreview.play();
        if (videoAudio) videoAudio.play().catch(function () {});
        this.textContent = "Ⅱ";
        this.setAttribute("aria-label", "Pause video");
    } else {
        videoPreview.pause();
        if (videoAudio) videoAudio.pause();
        this.textContent = "▶";
        this.setAttribute("aria-label", "Play video");
    }
});

videoPreview.addEventListener("pause", function () {
    document.getElementById("videoPlayButton").textContent = "▶";
    document.getElementById("videoPlayButton").setAttribute("aria-label", "Play video");
    if (videoAudio) videoAudio.pause();
});

document.getElementById("videoSeek").addEventListener("input", function () {
    if (videoPreview.duration) videoPreview.currentTime = videoPreview.duration * Number(this.value) / 1000;
});

document.getElementById("videoMuteButton").addEventListener("click", function () {
    videoPreview.muted = !videoPreview.muted;
    if (videoAudio) videoAudio.muted = videoPreview.muted;
    this.setAttribute("aria-label", videoPreview.muted ? "Unmute video" : "Mute video");
    this.textContent = videoPreview.muted ? "◌" : "◖";
});

if (videoAudioUpload) {
    videoAudioUpload.addEventListener("change", function () {
        const file = videoAudioUpload.files && videoAudioUpload.files[0];
        if (!file) return;
        if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
        audioObjectUrl = URL.createObjectURL(file);
        videoAudio = new Audio(audioObjectUrl);
        videoAudio.volume = Number(document.getElementById("videoVolume").value) / 100;
        document.getElementById("videoAudioTrackLabel").textContent = `♫ ${file.name}`;
        videoTimelineStatus.textContent = "Audio track added to the project.";
    });
}

document.getElementById("videoVolume").addEventListener("input", function () {
    const volume = Number(this.value);
    document.getElementById("videoVolumeValue").value = `${volume}%`;
    videoPreview.volume = volume / 100;
    if (videoAudio) videoAudio.volume = volume / 100;
});

document.getElementById("videoSpeed").addEventListener("input", function () {
    const speed = Number(this.value) / 100;
    videoPreview.playbackRate = speed;
    document.getElementById("videoSpeedValue").value = `${speed.toFixed(1)}×`;
});

document.getElementById("videoScale").addEventListener("input", function () {
    document.getElementById("videoScaleValue").value = `${this.value}%`;
    videoPreview.style.transform = `scale(${Number(this.value) / 100})`;
});

function updateVideoColor() {
    const brightness = Number(document.getElementById("videoBrightness").value);
    const saturation = Number(document.getElementById("videoSaturation").value);
    document.getElementById("videoBrightnessValue").value = `${brightness}%`;
    document.getElementById("videoSaturationValue").value = `${saturation}%`;
    videoPreview.style.filter = `brightness(${brightness}%) saturate(${saturation}%)`;
}

document.getElementById("videoBrightness").addEventListener("input", updateVideoColor);
document.getElementById("videoSaturation").addEventListener("input", updateVideoColor);

document.getElementById("videoAspectRatio").addEventListener("change", function () {
    document.getElementById("videoStage").dataset.ratio = this.value;
});

document.getElementById("videoTitleInput").addEventListener("input", function () {
    const title = this.value.trim();
    const overlay = document.getElementById("videoTitleOverlay");
    overlay.textContent = title;
    overlay.hidden = !title;
    document.getElementById("videoTitleTrack").innerHTML = title ? `<span>${title}</span>` : "<span>＋ Add title</span>";
});

document.getElementById("videoTrimStart").addEventListener("input", function () {
    const trimEnd = document.getElementById("videoTrimEnd");
    if (Number(this.value) >= Number(trimEnd.value)) trimEnd.value = Math.min(Number(trimEnd.max), Number(this.value) + 0.1);
    updateVideoTrimLabels();
    if (videoPreview.src) videoPreview.currentTime = Number(this.value);
});

document.getElementById("videoTrimEnd").addEventListener("input", function () {
    const trimStart = document.getElementById("videoTrimStart");
    if (Number(this.value) <= Number(trimStart.value)) trimStart.value = Math.max(0, Number(this.value) - 0.1);
    updateVideoTrimLabels();
});

document.getElementById("videoSplitButton").addEventListener("click", function () {
    if (!videoPreview.duration) {
        videoTimelineStatus.textContent = "Upload a video before splitting a clip.";
        return;
    }
    const marker = document.createElement("span");
    marker.className = "timeline-split-marker";
    marker.style.left = `${videoPreview.currentTime / videoPreview.duration * 100}%`;
    document.getElementById("videoClipTrack").appendChild(marker);
    videoTimelineStatus.textContent = `Split marker added at ${formatVideoTime(videoPreview.currentTime)}.`;
});

document.getElementById("videoTrimButton").addEventListener("click", function () {
    videoTimelineStatus.textContent = "Adjust Trim start and Trim end in the Video settings panel.";
    document.querySelector('[data-video-panel="video"]').click();
});

document.getElementById("videoAddTextButton").addEventListener("click", function () {
    document.getElementById("videoTitleInput").focus();
    document.querySelector('[data-video-panel="video"]').click();
});

document.getElementById("videoAddEffectButton").addEventListener("click", function () {
    document.querySelector('[data-video-panel="effects"]').click();
});

document.getElementById("videoTransitionsButton").addEventListener("click", function () {
    videoTimelineStatus.textContent = "Fade transition selected for the current clip.";
    videoPreview.style.transition = "opacity 300ms ease";
    document.getElementById("videoEffectTrack").innerHTML = "<span>Fade transition</span>";
});

document.getElementById("videoColorButton").addEventListener("click", function () {
    document.querySelector('[data-video-panel="filters"]').click();
});

document.getElementById("videoLayersButton").addEventListener("click", function () {
    videoTimelineStatus.textContent = "Video, audio, title, and effect tracks are available in the timeline.";
});

document.getElementById("videoAiButton").addEventListener("click", function () {
    videoTimelineStatus.textContent = "AI video editing requires a video-processing service; local preview controls remain available.";
});

document.querySelectorAll("[data-video-effect]").forEach(function (effectButton) {
    effectButton.addEventListener("click", function () {
        const effect = effectButton.dataset.videoEffect;
        const filters = {
            fade: "brightness(1.06) saturate(0.86)",
            film: "contrast(1.12) saturate(0.78) sepia(0.12)",
            soft: "brightness(1.08) saturate(1.08) blur(0.25px)",
            reset: "none",
        };
        videoPreview.style.filter = filters[effect];
        document.querySelectorAll("[data-video-effect]").forEach(function (item) {
            item.classList.toggle("active", item === effectButton);
        });
        document.getElementById("videoEffectTrack").innerHTML = effect === "reset" ? "<span>＋ Add effect</span>" : `<span>${effectButton.textContent.trim()} effect</span>`;
    });
});

async function exportEditedVideo() {
    if (!videoPreview.src || !videoPreview.duration) {
        videoTimelineStatus.textContent = "Upload a video before exporting.";
        return;
    }
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
        videoTimelineStatus.textContent = "This browser cannot export edited video. Try a current desktop browser.";
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoPreview.videoWidth || 1280;
    canvas.height = videoPreview.videoHeight || 720;
    const context = canvas.getContext("2d");
    const outputStream = canvas.captureStream(30);
    const sourceStream = typeof videoPreview.captureStream === "function" ? videoPreview.captureStream() : null;
    if (sourceStream) sourceStream.getAudioTracks().forEach(function (track) { outputStream.addTrack(track); });
    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
        .find(function (type) { return MediaRecorder.isTypeSupported(type); });
    const recorder = new MediaRecorder(outputStream, mimeType ? { mimeType: mimeType } : undefined);
    const chunks = [];
    const trimStart = Number(document.getElementById("videoTrimStart").value);
    const trimEnd = Math.min(videoPreview.duration, Number(document.getElementById("videoTrimEnd").value));
    let frameRequest = 0;

    function drawFrame() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.filter = videoPreview.style.filter || "none";
        context.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
        const title = document.getElementById("videoTitleInput").value.trim();
        if (title) {
            context.filter = "none";
            context.font = `700 ${Math.max(24, Math.round(canvas.width * 0.045))}px sans-serif`;
            context.textAlign = "center";
            context.fillStyle = "white";
            context.shadowColor = "rgba(0, 0, 0, 0.75)";
            context.shadowBlur = 12;
            context.fillText(title, canvas.width / 2, canvas.height * 0.22, canvas.width * 0.84);
            context.shadowBlur = 0;
        }
        frameRequest = requestAnimationFrame(drawFrame);
    }

    recorder.ondataavailable = function (event) {
        if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = function () {
        cancelAnimationFrame(frameRequest);
        outputStream.getTracks().forEach(function (track) { track.stop(); });
        if (sourceStream) sourceStream.getTracks().forEach(function (track) { track.stop(); });
        const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${videoProjectName.value || "stylora-video"}.webm`;
        link.click();
        URL.revokeObjectURL(downloadUrl);
        videoTimelineStatus.textContent = "Edited video exported as WebM.";
        document.getElementById("videoExportButton").disabled = false;
    };

    document.getElementById("videoExportButton").disabled = true;
    videoTimelineStatus.textContent = "Recording the edited preview for export…";
    videoPreview.pause();
    videoPreview.currentTime = trimStart;
    videoPreview.playbackRate = Number(document.getElementById("videoSpeed").value) / 100;
    if (videoAudio) {
        videoAudio.currentTime = trimStart;
        videoAudio.play().catch(function () {});
    }
    recorder.start();
    drawFrame();
    videoPreview.play().catch(function () {
        recorder.stop();
    });
    const stopAtTrim = function () {
        if (videoPreview.currentTime >= trimEnd && recorder.state === "recording") {
            videoPreview.pause();
            if (videoAudio) videoAudio.pause();
            recorder.stop();
            videoPreview.removeEventListener("timeupdate", stopAtTrim);
        }
    };
    videoPreview.addEventListener("timeupdate", stopAtTrim);
}

document.getElementById("videoExportButton").addEventListener("click", exportEditedVideo);

const videoHistoryInputs = ["videoScale", "videoSpeed", "videoBrightness", "videoSaturation", "videoTrimStart", "videoTrimEnd"];
let videoHistory = [videoHistoryInputs.map(function (id) { return Number(document.getElementById(id).value); })];
let videoHistoryIndex = 0;

function updateVideoHistoryButtons() {
    document.getElementById("videoUndoButton").disabled = videoHistoryIndex <= 0;
    document.getElementById("videoRedoButton").disabled = videoHistoryIndex >= videoHistory.length - 1;
}

function saveVideoHistory() {
    const snapshot = videoHistoryInputs.map(function (id) { return Number(document.getElementById(id).value); });
    if (JSON.stringify(snapshot) === JSON.stringify(videoHistory[videoHistoryIndex])) return;
    videoHistory = videoHistory.slice(0, videoHistoryIndex + 1);
    videoHistory.push(snapshot);
    videoHistoryIndex = videoHistory.length - 1;
    updateVideoHistoryButtons();
}

function restoreVideoHistory(index) {
    videoHistoryIndex = Math.max(0, Math.min(videoHistory.length - 1, index));
    videoHistoryInputs.forEach(function (id, itemIndex) {
        document.getElementById(id).value = videoHistory[videoHistoryIndex][itemIndex];
        document.getElementById(id).dispatchEvent(new Event("input", { bubbles: true }));
    });
    updateVideoTrimLabels();
    updateVideoHistoryButtons();
}

videoHistoryInputs.forEach(function (id) {
    document.getElementById(id).addEventListener("change", saveVideoHistory);
});

document.getElementById("videoUndoButton").addEventListener("click", function () {
    restoreVideoHistory(videoHistoryIndex - 1);
});
document.getElementById("videoRedoButton").addEventListener("click", function () {
    restoreVideoHistory(videoHistoryIndex + 1);
});

document.addEventListener(
    "DOMContentLoaded",
    function () {
        initializeDashboardControls();
        applyWorkspaceRoute(window.location.pathname, false);
        if (accessToken && currentUser) {
            showApplication();
        } else {
            showLogin();
        }

        checkExistingSession();

    }
);