(() => {
    const presets = {
        cinematic: [1.16, 0.88, 0.1, -4, 0.97],
        film: [1.1, 0.84, 0.16, -6, 1.02],
        vintage: [1.04, 0.9, 0.22, -8, 1.04],
        minimal: [0.96, 0.86, 0, 0, 1.03],
        moody: [1.25, 0.8, 0.08, -8, 0.88],
        warm: [1.04, 1.12, 0.18, -12, 1.08],
        cool: [1.08, 1.02, 0.02, 12, 1.02],
        dreamy: [0.94, 1.14, 0.1, -4, 1.13],
        luxury: [1.12, 0.94, 0.1, -4, 1.02],
        street: [1.24, 1.2, 0.02, 8, 0.98],
        anime: [1.24, 1.48, 0, 4, 1.08],
        editorial: [1.1, 0.76, 0.04, -2, 1.04],
    };
    const initialPhotoPrompt = "Apply the visual style of the reference image while preserving the original subject, face, composition, and important details.";
    const initialVideoPrompt = "Apply the chosen visual style while preserving the subject, movement, composition, and important details.";

    const byId = (id) => document.getElementById(id);
    const photoSourceInput = byId("photoRestyleSource");
    const photoReferenceInput = byId("photoRestyleReference");
    const photoBefore = byId("photoRestyleBefore");
    const photoAfter = byId("photoRestyleAfter");
    const photoLoading = byId("photoRestyleLoading");
    const photoButton = byId("photoRestyleButton");
    const photoStatus = byId("photoRestyleStatus");
    const photoPage = byId("photoRestylePage");
    const videoSourceInput = byId("videoRestyleSource");
    const videoReferenceInput = byId("videoRestyleReference");
    const videoBefore = byId("videoRestyleBefore");
    const videoAfter = byId("videoRestyleAfter");
    const videoLoading = byId("videoRestyleLoading");
    const videoButton = byId("videoRestyleButton");
    const videoStatus = byId("videoRestyleStatus");
    const videoPage = byId("videoRestylePage");

    let photoSourceUrl = "";
    let photoReferenceUrl = "";
    let photoResultUrl = "";
    let videoSourceUrl = "";
    let videoReferenceUrl = "";
    let videoResultReady = false;
    let photoHistory = [];
    let photoHistoryIndex = -1;
    let videoHistory = [];
    let videoHistoryIndex = -1;
    const objectUrls = new Map();
    let videoSourceObjectUrl = "";
    let videoReferenceObjectUrl = "";

    function localizeMediaUrl(value) {
        try {
            const url = new URL(value, window.location.href);
            if ((url.hostname === "127.0.0.1" || url.hostname === "localhost") && url.pathname.startsWith("/media/")) {
                return `${url.pathname}${url.search}`;
            }
        } catch (error) {
            return value;
        }
        return value;
    }

    function selectedPreset(mode) {
        return document.querySelector(`#${mode}RestylePresets .restyle-preset.active`)?.dataset.restylePreset || "cinematic";
    }

    function getFilter(mode, presetName) {
        const [contrast, saturation, sepia, hue, brightness] = presets[presetName] || presets.cinematic;
        const strength = Number(byId(`${mode}RestyleStrength`).value) / 100;
        const color = Number(byId(`${mode}RestyleColor`).value) / 100;
        const lighting = Number(byId(`${mode}RestyleLighting`).value);
        const contrastValue = 1 + (contrast - 1) * strength;
        const saturationValue = 1 + (saturation - 1) * strength * color;
        const brightnessValue = 1 + (brightness - 1) * strength + (lighting - 50) / 500;
        const sepiaValue = Math.max(0, sepia * strength * color);
        const hueValue = hue * strength * color;
        return `brightness(${brightnessValue.toFixed(3)}) contrast(${contrastValue.toFixed(3)}) saturate(${saturationValue.toFixed(3)}) sepia(${sepiaValue.toFixed(3)}) hue-rotate(${hueValue.toFixed(1)}deg)`;
    }

    function applyPreviewFilter(mode) {
        const filter = getFilter(mode, selectedPreset(mode));
        const after = mode === "photo" ? photoAfter : videoAfter;
        if (after) after.style.filter = filter;
        ["Strength", "Color", "Lighting"].forEach((name) => {
            const control = byId(`${mode}Restyle${name}`);
            const output = byId(`${mode}Restyle${name}Value`);
            if (control && output) output.value = `${control.value}%`;
        });
    }

    function showFile(input, nameId, preview, placeholder) {
        const file = input.files && input.files[0];
        if (!file) return "";
        const previousUrl = objectUrls.get(input);
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        const objectUrl = URL.createObjectURL(file);
        objectUrls.set(input, objectUrl);
        byId(nameId).textContent = file.name;
        if (preview) {
            preview.src = objectUrl;
            preview.hidden = false;
        }
        if (placeholder) placeholder.hidden = true;
        return objectUrl;
    }

    function photoSnapshot() {
        return {
            preset: selectedPreset("photo"),
            strength: byId("photoRestyleStrength").value,
            color: byId("photoRestyleColor").value,
            lighting: byId("photoRestyleLighting").value,
            preserveFace: byId("photoPreserveFace").checked,
            preserveComposition: byId("photoPreserveComposition").checked,
            prompt: byId("photoRestylePrompt").value,
        };
    }

    function videoSnapshot() {
        return {
            preset: selectedPreset("video"),
            strength: byId("videoRestyleStrength").value,
            color: byId("videoRestyleColor").value,
            lighting: byId("videoRestyleLighting").value,
            preserveSubject: byId("videoPreserveSubject").checked,
            preserveMotion: byId("videoPreserveMotion").checked,
            preserveComposition: byId("videoPreserveComposition").checked,
            scope: document.querySelector('input[name="videoRestyleScope"]:checked').value,
            prompt: byId("videoRestylePrompt").value,
        };
    }

    function updateHistoryButtons(mode) {
        const history = mode === "photo" ? photoHistory : videoHistory;
        const index = mode === "photo" ? photoHistoryIndex : videoHistoryIndex;
        byId(`${mode}RestyleUndo`).disabled = index <= 0;
        byId(`${mode}RestyleRedo`).disabled = index >= history.length - 1;
    }

    function saveHistory(mode) {
        const state = mode === "photo" ? photoSnapshot() : videoSnapshot();
        let history = mode === "photo" ? photoHistory : videoHistory;
        let index = mode === "photo" ? photoHistoryIndex : videoHistoryIndex;
        if (JSON.stringify(history[index]) === JSON.stringify(state)) return;
        history = history.slice(0, index + 1);
        history.push(state);
        index = history.length - 1;
        if (mode === "photo") {
            photoHistory = history;
            photoHistoryIndex = index;
        } else {
            videoHistory = history;
            videoHistoryIndex = index;
        }
        updateHistoryButtons(mode);
    }

    function applySnapshot(mode, state) {
        const prefix = mode === "photo" ? "photo" : "video";
        ["preset", "strength", "color", "lighting"].forEach((name) => {
            const control = name === "preset" ? null : byId(`${prefix}Restyle${name[0].toUpperCase()}${name.slice(1)}`);
            if (control) control.value = state[name];
        });
        document.querySelectorAll(`#${prefix}RestylePresets .restyle-preset`).forEach((button) => {
            button.classList.toggle("active", button.dataset.restylePreset === state.preset);
        });
        byId(`${prefix}RestylePrompt`).value = state.prompt;
        if (mode === "photo") {
            byId("photoPreserveFace").checked = state.preserveFace;
            byId("photoPreserveComposition").checked = state.preserveComposition;
        } else {
            byId("videoPreserveSubject").checked = state.preserveSubject;
            byId("videoPreserveMotion").checked = state.preserveMotion;
            byId("videoPreserveComposition").checked = state.preserveComposition;
            document.querySelector(`input[name="videoRestyleScope"][value="${state.scope}"]`).checked = true;
        }
        applyPreviewFilter(mode);
    }

    function restoreHistory(mode, delta) {
        if (mode === "photo") {
            photoHistoryIndex = Math.max(0, Math.min(photoHistory.length - 1, photoHistoryIndex + delta));
            applySnapshot(mode, photoHistory[photoHistoryIndex]);
        } else {
            videoHistoryIndex = Math.max(0, Math.min(videoHistory.length - 1, videoHistoryIndex + delta));
            applySnapshot(mode, videoHistory[videoHistoryIndex]);
        }
        updateHistoryButtons(mode);
    }

    function bindModeControls(mode) {
        document.querySelectorAll(`#${mode}RestylePresets .restyle-preset`).forEach((button) => {
            button.addEventListener("click", () => {
                document.querySelectorAll(`#${mode}RestylePresets .restyle-preset`).forEach((item) => item.classList.toggle("active", item === button));
                applyPreviewFilter(mode);
                saveHistory(mode);
            });
        });
        ["Strength", "Color", "Lighting"].forEach((name) => {
            const control = byId(`${mode}Restyle${name}`);
            control.addEventListener("input", () => applyPreviewFilter(mode));
            control.addEventListener("change", () => saveHistory(mode));
        });
        byId(`${mode}RestylePrompt`).addEventListener("change", () => saveHistory(mode));
        byId(`${mode}RestyleUndo`).addEventListener("click", () => restoreHistory(mode, -1));
        byId(`${mode}RestyleRedo`).addEventListener("click", () => restoreHistory(mode, 1));
    }

    bindModeControls("photo");
    bindModeControls("video");

    photoSourceInput.addEventListener("change", () => {
        photoSourceUrl = showFile(photoSourceInput, "photoRestyleSourceFileName", photoBefore, byId("photoRestyleSourcePlaceholder"));
        if (photoSourceUrl) byId("photoRestyleSourceName").textContent = photoSourceInput.files[0].name;
    });

    photoReferenceInput.addEventListener("change", () => {
        photoReferenceUrl = showFile(photoReferenceInput, "photoRestyleReferenceFileName");
    });

    async function restylePhoto() {
        const sourceFile = photoSourceInput.files && photoSourceInput.files[0];
        const referenceFile = photoReferenceInput.files && photoReferenceInput.files[0];
        if (!sourceFile) {
            photoStatus.textContent = "Upload a photo before starting Restyle.";
            return;
        }
        const originalLabel = photoButton.innerHTML;
        photoButton.disabled = true;
        photoButton.classList.add("is-processing");
        photoButton.innerHTML = '<span class="restyle-loader"></span> Restyling Photo…';
        photoLoading.hidden = false;
        photoPage.classList.add("is-processing");
        photoStatus.textContent = "Analyzing the reference and applying its style…";

        try {
            if (referenceFile) {
                const formData = new FormData();
                formData.append("source_image", sourceFile);
                formData.append("reference_image", referenceFile);
                formData.append("intensity", String(Number(byId("photoRestyleStrength").value) / 40));
                formData.append("name", `Stylora ${selectedPreset("photo")} restyle`);
                formData.append("prompt", byId("photoRestylePrompt").value);
                formData.append("preserve_face", String(byId("photoPreserveFace").checked));
                formData.append("preserve_composition", String(byId("photoPreserveComposition").checked));
                const result = await apiRequest(`${API_BASE}/style-match/`, { method: "POST", body: formData });
                if (!result.edited_image_url) throw new Error("The style service did not return an edited image.");
                photoResultUrl = localizeMediaUrl(result.edited_image_url);
                photoAfter.src = photoResultUrl;
                photoStatus.textContent = "AI Restyle complete. Your original photo remains unchanged.";
            } else {
                await new Promise((resolve) => window.setTimeout(resolve, 850));
                photoResultUrl = "";
                photoAfter.src = photoSourceUrl;
                photoStatus.textContent = "Preset preview ready. Add a reference image for AI style matching.";
            }
            photoAfter.hidden = false;
            photoAfter.style.filter = getFilter("photo", selectedPreset("photo"));
            byId("photoRestyleAfterPlaceholder").hidden = true;
            byId("photoRestyleResultLabel").textContent = `${selectedPreset("photo")} · ${byId("photoRestyleStrength").value}%`;
            saveHistory("photo");
        } catch (error) {
            photoStatus.textContent = `Restyle failed: ${error.message}`;
        } finally {
            photoLoading.hidden = true;
            photoPage.classList.remove("is-processing");
            photoButton.classList.remove("is-processing");
            photoButton.innerHTML = originalLabel;
            photoButton.disabled = false;
        }
    }

    photoButton.addEventListener("click", restylePhoto);

    byId("photoRestyleReset").addEventListener("click", () => {
        applySnapshot("photo", {
            preset: "cinematic", strength: "72", color: "65", lighting: "60",
            preserveFace: true, preserveComposition: true, prompt: initialPhotoPrompt,
        });
        photoResultUrl = "";
        photoAfter.removeAttribute("src");
        photoAfter.hidden = true;
        byId("photoRestyleAfterPlaceholder").hidden = false;
        byId("photoRestyleResultLabel").textContent = "Restyle preview";
        photoStatus.textContent = photoSourceInput.files.length ? "Settings reset. Restyle when ready." : "Upload a photo and reference to begin.";
        photoHistory = [photoSnapshot()];
        photoHistoryIndex = 0;
        updateHistoryButtons("photo");
    });

    byId("photoRestyleDownload").addEventListener("click", async () => {
        if (!photoAfter.src || photoAfter.hidden) {
            photoStatus.textContent = "Restyle a photo before exporting.";
            return;
        }
        try {
            const response = await fetch(photoAfter.src);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${byId("photoRestyleProjectName").value || "style-mirror-restyle"}.png`;
            link.click();
            URL.revokeObjectURL(url);
            photoStatus.textContent = "Restyled photo downloaded.";
        } catch (error) {
            const link = document.createElement("a");
            link.href = photoAfter.src;
            link.download = `${byId("photoRestyleProjectName").value || "style-mirror-restyle"}.png`;
            link.click();
            photoStatus.textContent = "Download started.";
        }
    });

    videoSourceInput.addEventListener("change", () => {
        const file = videoSourceInput.files && videoSourceInput.files[0];
        if (!file) return;
        if (videoSourceObjectUrl) URL.revokeObjectURL(videoSourceObjectUrl);
        videoSourceObjectUrl = URL.createObjectURL(file);
        videoSourceUrl = videoSourceObjectUrl;
        videoBefore.src = videoSourceUrl;
        videoBefore.hidden = false;
        byId("videoRestyleSourcePlaceholder").hidden = true;
        byId("videoRestyleSourceFileName").textContent = file.name;
        byId("videoRestyleSourceName").textContent = file.name;
        byId("videoRestyleTimeline").innerHTML = '<div class="restyle-timeline-clip"></div>';
        videoResultReady = false;
    });

    videoReferenceInput.addEventListener("change", () => {
        const file = videoReferenceInput.files && videoReferenceInput.files[0];
        if (!file) return;
        if (videoReferenceObjectUrl) URL.revokeObjectURL(videoReferenceObjectUrl);
        videoReferenceObjectUrl = URL.createObjectURL(file);
        videoReferenceUrl = videoReferenceObjectUrl;
        byId("videoRestyleReferenceFileName").textContent = file.name;
    });

    videoBefore.addEventListener("loadedmetadata", () => {
        byId("videoRestyleDuration").textContent = formatVideoTime(videoBefore.duration);
    });

    videoBefore.addEventListener("timeupdate", () => {
        const duration = videoBefore.duration || 0;
        byId("videoRestyleSeek").value = duration ? Math.round(videoBefore.currentTime / duration * 1000) : 0;
        if (videoAfter.src && Math.abs(videoAfter.currentTime - videoBefore.currentTime) > 0.35) {
            videoAfter.currentTime = videoBefore.currentTime;
        }
    });

    byId("videoRestyleSeek").addEventListener("input", function () {
        if (!videoBefore.duration) return;
        videoBefore.currentTime = videoBefore.duration * Number(this.value) / 1000;
        if (videoAfter.src) videoAfter.currentTime = videoBefore.currentTime;
    });

    async function restyleVideo() {
        if (!videoSourceUrl || !videoBefore.duration) {
            videoStatus.textContent = "Upload a video before starting Restyle.";
            return;
        }
        const originalLabel = videoButton.innerHTML;
        videoButton.disabled = true;
        videoButton.classList.add("is-processing");
        videoButton.innerHTML = '<span class="restyle-loader"></span> Preparing preview…';
        videoLoading.hidden = false;
        videoPage.classList.add("is-processing");
        videoStatus.textContent = "Preparing your selected style for preview…";

        window.setTimeout(() => {
            videoAfter.src = videoSourceUrl;
            videoAfter.currentTime = videoBefore.currentTime;
            videoAfter.style.filter = getFilter("video", selectedPreset("video"));
            videoAfter.hidden = false;
            byId("videoRestyleAfterPlaceholder").hidden = true;
            byId("videoRestyleAfterLabel").textContent = `${selectedPreset("video")} preview`;
            videoResultReady = true;
            const scope = document.querySelector('input[name="videoRestyleScope"]:checked').value === "all" ? "entire video" : "selected clip";
            videoStatus.textContent = `Local style preview ready for the ${scope}. AI video transformation needs a connected video-processing service.`;
            videoLoading.hidden = true;
            videoPage.classList.remove("is-processing");
            videoButton.classList.remove("is-processing");
            videoButton.innerHTML = originalLabel;
            videoButton.disabled = false;
            saveHistory("video");
        }, 900);
    }

    videoButton.addEventListener("click", restyleVideo);

    videoBefore.addEventListener("click", async () => {
        if (!videoBefore.src) return;
        if (videoBefore.paused) {
            if (videoAfter.src) {
                videoAfter.currentTime = videoBefore.currentTime;
                videoAfter.play().catch(() => {});
            }
            await videoBefore.play().catch(() => {});
        } else {
            videoBefore.pause();
            videoAfter.pause();
        }
    });

    byId("videoRestyleReset").addEventListener("click", () => {
        applySnapshot("video", {
            preset: "cinematic", strength: "70", color: "65", lighting: "60",
            preserveSubject: true, preserveMotion: true, preserveComposition: true,
            scope: "all", prompt: initialVideoPrompt,
        });
        videoAfter.pause();
        videoAfter.removeAttribute("src");
        videoAfter.load();
        videoAfter.hidden = true;
        byId("videoRestyleAfterPlaceholder").hidden = false;
        byId("videoRestyleAfterLabel").textContent = "Restyle preview";
        videoResultReady = false;
        videoStatus.textContent = videoSourceUrl ? "Settings reset. Restyle when ready." : "Upload a video and choose a style to preview.";
        videoHistory = [videoSnapshot()];
        videoHistoryIndex = 0;
        updateHistoryButtons("video");
    });

    byId("videoRestyleExport").addEventListener("click", () => {
        if (!videoResultReady || !videoAfter.src) {
            videoStatus.textContent = "Create a Restyle preview before exporting.";
            return;
        }
        if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
            videoStatus.textContent = "This browser cannot export video. Try a current desktop browser.";
            return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = videoAfter.videoWidth || 1280;
        canvas.height = videoAfter.videoHeight || 720;
        const context = canvas.getContext("2d");
        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
        const chunks = [];
        const end = videoAfter.duration || 0;
        let frameId = 0;
        const draw = () => {
            context.filter = getComputedStyle(videoAfter).filter;
            context.drawImage(videoAfter, 0, 0, canvas.width, canvas.height);
            frameId = requestAnimationFrame(draw);
        };
        recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        recorder.onstop = () => {
            cancelAnimationFrame(frameId);
            stream.getTracks().forEach((track) => track.stop());
            const blob = new Blob(chunks, { type: "video/webm" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${byId("videoRestyleProjectName").value || "style-mirror-video"}.webm`;
            link.click();
            URL.revokeObjectURL(url);
            videoStatus.textContent = "Local preview exported as WebM. AI video restyling is not connected.";
        };
        videoAfter.pause();
        videoAfter.currentTime = 0;
        recorder.start();
        draw();
        videoAfter.play().catch(() => recorder.stop());
        videoAfter.ontimeupdate = () => {
            if (videoAfter.currentTime >= end && recorder.state === "recording") {
                videoAfter.pause();
                recorder.stop();
            }
        };
        videoStatus.textContent = "Recording the local preview for WebM export…";
    });

    photoHistory = [photoSnapshot()];
    videoHistory = [videoSnapshot()];
    photoHistoryIndex = 0;
    videoHistoryIndex = 0;
    updateHistoryButtons("photo");
    updateHistoryButtons("video");
    applyPreviewFilter("photo");
    applyPreviewFilter("video");
})();