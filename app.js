// Error Handling
window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.error('App Error:', msg, error);
    return false;
};

// State
const initialState = {
    personal: {
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1 234 567 890',
        linkedin: 'linkedin.com/in/johndoe',
        website: 'johndoe.com',
        location: 'New York, NY',
        headline: 'Senior Software Engineer'
    },
    experience: [
        {
            id: 1,
            company: 'Tech Corp',
            role: 'Senior Developer',
            location: 'San Francisco, CA',
            startDate: '2020-01',
            endDate: 'Present',
            description: '• Led a team of 5 developers\n• Architected microservices'
        }
    ],
    education: [
        {
            id: 1,
            school: 'University of Tech',
            degree: 'B.S. CS',
            location: 'Boston, MA',
            startDate: '2015',
            endDate: '2019'
        }
    ],
    skills: 'JavaScript, React, Node.js',
    template: 'modern'
};

// Safe Init
function getInitialState() {
    try {
        const s = localStorage.getItem('resumeState');
        if (s) {
            const parsed = JSON.parse(s);
            // Build a merged state to ensure new fields (like linkedin/website) exist
            return {
                ...initialState,
                ...parsed,
                personal: {
                    ...initialState.personal, // Defaults
                    ...(parsed.personal || {}) // User saved data overrides defaults
                }
            };
        }
        return initialState;
    } catch {
        return initialState;
    }
}

const store = {
    state: getInitialState(),
    listeners: [],

    setState(s) {
        this.state = { ...this.state, ...s };
        try {
            localStorage.setItem('resumeState', JSON.stringify(this.state));
        } catch (e) {
            console.error('Storage Error:', e);
            if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
                alert('⚠️ Storage Full! Your CV is too large (likely due to the photo). Please upload a smaller photo or remove it to save changes.');
            }
        }
        this.notify();
    },

    notify() { this.listeners.forEach(l => l(this.state)); },
    subscribe(l) { this.listeners.push(l); }
};

// Cloud save - actually notifies user
window.saveToCloud = async () => {
    try {
        localStorage.setItem('resumeState', JSON.stringify(store.state));

        // Show a better feedback
        const btn = document.querySelector('button[title="Save"]');
        const originalContent = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = '<div class="text-green-600"><i data-lucide="check" class="w-5 h-5"></i></div>';
            if (window.lucide) lucide.createIcons();
            setTimeout(() => {
                btn.innerHTML = originalContent;
                if (window.lucide) lucide.createIcons();
                // Delay slightly to ensure browser repaints
                setTimeout(() => {
                    if (window.lucide) lucide.createIcons();
                }, 100);
            }, 2000);
        }
        alert('✅ CV saved locally! (Cloud save is simulated)');
    } catch (e) {
        alert('Error saving: ' + e.message);
    }
};

window.loadFromCloud = async () => {
    alert('🔄 Reloading saved data...');
    location.reload();
};

window.selectTemplate = (t) => {
    store.setState({ template: t });
    updateTemplateSelectionUI(t);
};

function updateTemplateSelectionUI(t) {
    document.querySelectorAll('[data-template-card]').forEach(el => {
        const isSelected = el.dataset.templateCard === t;
        const badge = el.querySelector('.selected-badge');

        if (isSelected) {
            el.classList.add('border-blue-600', 'bg-blue-50/50');
            el.classList.remove('border-gray-200');
            if (badge) badge.classList.remove('hidden');
        } else {
            el.classList.remove('border-blue-600', 'bg-blue-50/50');
            el.classList.add('border-gray-200');
            if (badge) badge.classList.add('hidden');
        }
    });
}

// UI Logic
function initApp() {
    console.log('App starting...');
    render();
    store.subscribe(renderPreview);

    // UI State
    const editorPanel = document.querySelector('.editor-panel');
    let isEditorOpen = false;

    // Tab switching with Toggle Logic
    window.switchTab = (id) => {
        // If clicking same tab, toggle close
        const currentActive = document.querySelector('.nav-item.active');
        const clickedSame = currentActive && currentActive.id === `nav-${id}`;

        // Hide all content first
        document.querySelectorAll('.section-content').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

        if (clickedSame && isEditorOpen) {
            // Close editor
            editorPanel.classList.remove('open');
            isEditorOpen = false;
        } else {
            // Open editor and show new content
            document.getElementById(`section-${id}`).classList.remove('hidden');
            document.getElementById(`nav-${id}`).classList.add('active');
            editorPanel.classList.add('open');
            isEditorOpen = true;
        }
    };

    // Initial tab
    if (document.getElementById('section-personal')) {
        window.switchTab('personal');
    }
}

window.handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Basic Size Check (Max 4MB initial check)
    if (file.size > 4 * 1024 * 1024) {
        alert('File size too big. Please choose an image under 4MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        // 2. Compress Image Logic
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Max dimensions
            const MAX_WIDTH = 300;
            const MAX_HEIGHT = 300;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Export as compressed JPEG
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

            store.setState({
                personal: {
                    ...store.state.personal,
                    photo: compressedBase64
                }
            });
        };
    };
    reader.readAsDataURL(file);
};

window.removePhoto = () => {
    const s = store.state;
    const newPersonal = { ...s.personal };
    delete newPersonal.photo;
    store.setState({ personal: newPersonal });
    // Reset file input
    document.getElementById('photo-upload').value = '';
};

function render() {
    renderPreview();
    renderInputs();
}

function renderInputs() {
    const s = store.state;

    // Photo Preview in Editor
    const photoPreview = document.getElementById('photo-preview');
    const removeBtn = document.getElementById('remove-photo-btn');

    if (photoPreview && s.personal.photo) {
        photoPreview.innerHTML = `<img src="${s.personal.photo}" class="w-full h-full object-cover">`;
        photoPreview.classList.remove('border-dashed', 'border-2');
        if (removeBtn) removeBtn.classList.remove('hidden');
    } else if (photoPreview) {
        photoPreview.innerHTML = `<i data-lucide="camera" class="w-8 h-8"></i>`;
        photoPreview.classList.add('border-dashed', 'border-2');
        if (removeBtn) removeBtn.classList.add('hidden');
        if (window.lucide) lucide.createIcons();
    }

    // Personal Inputs
    document.querySelectorAll('input[data-model^="personal."]').forEach(el => {
        const key = el.dataset.model.split('.')[1];
        el.value = s.personal[key] || '';
        el.oninput = (e) => {
            store.setState({ personal: { ...s.personal, [key]: e.target.value } });
        };
    });

    // Skills Input
    const skillsInput = document.querySelector('textarea[data-model="skills"]');
    if (skillsInput) {
        skillsInput.value = s.skills || '';
        skillsInput.oninput = (e) => {
            store.setState({ skills: e.target.value });
        };
    }

    renderExperienceInputs();
    renderEducationInputs();
}

// === Experience Logic ===
function renderExperienceInputs() {
    const list = document.getElementById('experience-list');
    if (!list) return;

    list.innerHTML = store.state.experience.map((item, index) => `
        <div class="section-card relative group">
            <button onclick="removeExperience(${item.id})" class="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors p-1" title="Remove">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
            <div class="grid grid-cols-1 gap-4">
                <div>
                     <label class="rezi-label" data-i18n="label.company">Company</label>
                     <input type="text" value="${item.company}" oninput="updateExperience(${index}, 'company', this.value)" class="rezi-input" placeholder="Company Name">
                </div>
                <div>
                     <label class="rezi-label" data-i18n="label.role">Role</label>
                     <input type="text" value="${item.role}" oninput="updateExperience(${index}, 'role', this.value)" class="rezi-input" placeholder="Role / Job Title">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="rezi-label" data-i18n="label.start_date">Start Date</label>
                        <input type="text" value="${item.startDate}" oninput="updateExperience(${index}, 'startDate', this.value)" class="rezi-input" placeholder="YYYY-MM">
                    </div>
                    <div>
                        <label class="rezi-label" data-i18n="label.end_date">End Date</label>
                        <input type="text" value="${item.endDate}" oninput="updateExperience(${index}, 'endDate', this.value)" class="rezi-input" placeholder="Present">
                    </div>
                </div>
                <div>
                     <div class="flex justify-between items-center mb-1">
                        <label class="rezi-label mb-0" data-i18n="label.description">Description</label>
                        <button onclick="generateAiDescription(${index}, '${item.role || 'General'}')" class="text-xs flex items-center gap-1 text-purple-600 font-bold hover:bg-purple-50 px-2 py-1 rounded transition-colors border border-purple-200">
                            <i data-lucide="sparkles" class="w-3 h-3"></i> AI Writer
                        </button>
                     </div>
                     <div id="ai-suggestions-${index}" class="hidden mb-3 bg-purple-50 border border-purple-100 rounded-lg p-3">
                        <p class="text-[10px] items-center font-bold text-purple-700 mb-2 uppercase tracking-wider flex justify-between">
                            AI Suggestions
                            <button onclick="document.getElementById('ai-suggestions-${index}').classList.add('hidden')" class="hover:text-purple-900"><i data-lucide="x" class="w-3 h-3"></i></button>
                        </p>
                        <div id="ai-list-${index}" class="space-y-2">
                            <!-- Suggestions injected here -->
                        </div>
                     </div>
                     <textarea id="exp-desc-${index}" oninput="updateExperience(${index}, 'description', this.value)" class="rezi-input h-32 resize-none leading-relaxed" placeholder="Did X to achieve Y...">${item.description}</textarea>
                </div>
            </div>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
    // Re-apply translations for new elements
    const currentLang = localStorage.getItem('preferredLanguage') || 'en';
    if (window.changeLanguage) window.changeLanguage(currentLang);
}

window.generateAiDescription = (index, role) => {
    const listContainer = document.getElementById(`ai-suggestions-${index}`);
    const suggestionsList = document.getElementById(`ai-list-${index}`);

    // Toggle if already visible
    if (!listContainer.classList.contains('hidden')) {
        listContainer.classList.add('hidden');
        return;
    }

    // Mock AI Generation based on role
    const suggestions = [
        `• Led the development of key features for ${role}, improving user engagement by 20%.`,
        `• Collaborated with cross-functional teams to design and implement scalable solutions.`,
        `• Optimized legacy codebases, reducing technical debt and improving performance by 30%.`,
        `• Mentored junior team members and established best practices for code quality.`,
        `• Conducted data analysis to identify trends and drive decision-making processes.`
    ];

    suggestionsList.innerHTML = suggestions.map(text => `
        <button onclick="applyAiSuggestion(${index}, '${text.replace(/'/g, "\\'")}')" class="text-xs text-left w-full p-2 bg-white border border-purple-100 rounded hover:border-purple-300 hover:shadow-sm transition-all text-gray-700 flex items-start gap-2 group">
            <i data-lucide="plus" class="w-3 h-3 text-purple-400 mt-0.5 group-hover:text-purple-600"></i>
            <span>${text}</span>
        </button>
    `).join('');

    listContainer.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
};

window.applyAiSuggestion = (index, text) => {
    const textarea = document.getElementById(`exp-desc-${index}`);
    const currentVal = textarea.value;
    const separator = currentVal.length > 0 && !currentVal.endsWith('\n') ? '\n' : '';

    const newVal = currentVal + separator + text;

    // Update UI and State
    textarea.value = newVal;
    updateExperience(index, 'description', newVal);

    // Pulse effect
    textarea.classList.add('border-purple-400', 'bg-purple-50/20');
    setTimeout(() => {
        textarea.classList.remove('border-purple-400', 'bg-purple-50/20');
        // Hide suggestions after pick? No, let them pick more if they want.
    }, 500);
};

window.addExperience = () => {
    const newExp = {
        id: Date.now(),
        company: 'New Company',
        role: 'Job Title',
        location: '',
        startDate: '',
        endDate: '',
        description: ''
    };
    store.setState({ experience: [...store.state.experience, newExp] });
};

window.removeExperience = (id) => {
    store.setState({ experience: store.state.experience.filter(i => i.id !== id) });
};

window.updateExperience = (index, field, value) => {
    const newExp = [...store.state.experience];
    newExp[index] = { ...newExp[index], [field]: value };
    store.setState({ experience: newExp });
};


// === Education Logic ===
function renderEducationInputs() {
    const list = document.getElementById('education-list');
    if (!list) return;

    list.innerHTML = store.state.education.map((item, index) => `
        <div class="section-card relative group">
             <button onclick="removeEducation(${item.id})" class="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors p-1">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
            <div class="grid grid-cols-1 gap-4">
                <div>
                     <label class="rezi-label" data-i18n="label.school">School</label>
                     <input type="text" value="${item.school}" oninput="updateEducation(${index}, 'school', this.value)" class="rezi-input" placeholder="University Name">
                </div>
                <div>
                     <label class="rezi-label" data-i18n="label.degree">Degree</label>
                     <input type="text" value="${item.degree}" oninput="updateEducation(${index}, 'degree', this.value)" class="rezi-input" placeholder="Bachelor's in CS">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="rezi-label" data-i18n="label.start_date">Start Date</label>
                        <input type="text" value="${item.startDate}" oninput="updateEducation(${index}, 'startDate', this.value)" class="rezi-input" placeholder="YYYY">
                    </div>
                    <div>
                        <label class="rezi-label" data-i18n="label.end_date">End Date</label>
                        <input type="text" value="${item.endDate}" oninput="updateEducation(${index}, 'endDate', this.value)" class="rezi-input" placeholder="YYYY">
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
    // Re-apply translations
    const currentLang = localStorage.getItem('preferredLanguage') || 'en';
    if (window.changeLanguage) window.changeLanguage(currentLang);
}

window.addEducation = () => {
    const newEdu = {
        id: Date.now(),
        school: 'New School',
        degree: 'Degree',
        location: '',
        startDate: '',
        endDate: ''
    };
    store.setState({ education: [...store.state.education, newEdu] });
};

window.removeEducation = (id) => {
    store.setState({ education: store.state.education.filter(i => i.id !== id) });
};

window.updateEducation = (index, field, value) => {
    const newEdu = [...store.state.education];
    newEdu[index] = { ...newEdu[index], [field]: value };
    store.setState({ education: newEdu });
};

function renderPreview() {
    const s = store.state;
    const p = document.getElementById('resume-preview-content');
    if (!p) return;

    if (s.template === 'executive') {
        p.innerHTML = `
            <div class="text-center border-b-2 border-gray-800 pb-4 mb-6 relative">
                ${s.personal.photo ? `<img src="${s.personal.photo}" class="w-32 h-32 rounded-full object-cover mx-auto mb-4 border-4 border-gray-200">` : ''}
                <h1 class="text-4xl font-serif font-bold text-gray-900 mb-2 uppercase tracking-widest">${s.personal.fullName}</h1>
                <div class="text-sm text-gray-600 flex flex-wrap justify-center gap-4">
                    <span>${s.personal.email}</span>
                    <span>${s.personal.phone}</span>
                    <span>${s.personal.location}</span>
                </div>
                 <div class="text-sm text-gray-600 flex flex-wrap justify-center gap-4 mt-1">
                    ${s.personal.linkedin ? `<a href="https://${s.personal.linkedin.replace(/^https?:\/\//, '')}" target="_blank" class="hover:underline text-gray-800">${s.personal.linkedin}</a>` : ''}
                    ${s.personal.website ? `<a href="https://${s.personal.website.replace(/^https?:\/\//, '')}" target="_blank" class="hover:underline text-gray-800">${s.personal.website}</a>` : ''}
                </div>
            </div>

            <div class="mb-6">
                 <h3 class="font-bold font-serif text-lg bg-gray-100 p-1 mb-3 text-gray-800 border-l-4 border-gray-800 pl-2">SUMMARY</h3>
                 <p class="text-gray-700 leading-relaxed font-serif">${s.personal.headline}</p>
            </div>
            
            <div class="mb-6">
                <h3 class="font-bold font-serif text-lg bg-gray-100 p-1 mb-3 text-gray-800 border-l-4 border-gray-800 pl-2">EXPERIENCE</h3>
                ${s.experience.map(e => `
                    <div class="mb-5 last:mb-0">
                        <div class="flex justify-between items-baseline mb-1">
                            <span class="font-bold text-gray-900 text-lg font-serif">${e.company}</span>
                            <span class="text-sm font-medium text-gray-600 font-serif">${e.startDate} - ${e.endDate}</span>
                        </div>
                        <div class="text-gray-800 font-semibold italic mb-1 font-serif">${e.role}</div>
                        <div class="text-sm text-gray-700 whitespace-pre-line leading-relaxed pl-1 font-serif">${e.description}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="mb-6">
                <h3 class="font-bold font-serif text-lg bg-gray-100 p-1 mb-3 text-gray-800 border-l-4 border-gray-800 pl-2">EDUCATION</h3>
                ${s.education.map(e => `
                    <div class="mb-3 last:mb-0">
                        <div class="flex justify-between items-baseline">
                            <span class="font-bold text-gray-900 font-serif">${e.school}</span>
                            <span class="text-sm text-gray-600 font-serif">${e.startDate} - ${e.endDate}</span>
                        </div>
                        <div class="italic text-gray-700 font-serif">${e.degree}</div>
                    </div>
                `).join('')}
            </div>
            
            <div>
                <h3 class="font-bold font-serif text-lg bg-gray-100 p-1 mb-3 text-gray-800 border-l-4 border-gray-800 pl-2">SKILLS</h3>
                <div class="text-gray-700 leading-relaxed font-serif">${s.skills}</div>
            </div>
        `;
    } else if (s.template === 'creative') {
        p.innerHTML = `
            <div class="bg-indigo-600 text-white p-8 mb-8 -mx-8 -mt-8 flex items-center justify-between">
                <div>
                    <h1 class="text-5xl font-black mb-2 tracking-tight">${s.personal.fullName}</h1>
                    <p class="text-xl font-medium text-indigo-200 tracking-wide uppercase">${s.personal.headline}</p>
                </div>
                ${s.personal.photo ? `<img src="${s.personal.photo}" class="w-32 h-32 rounded-full border-4 border-white/30 object-cover shadow-lg">` : ''}
            </div>

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-4 space-y-8 border-r border-gray-100 pr-6">
                    <div>
                        <h4 class="font-bold text-indigo-600 uppercase tracking-widest text-xs mb-4">Contact</h4>
                        <div class="space-y-3 text-sm text-gray-600">
                             <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                    <i data-lucide="mail" class="w-4 h-4"></i>
                                </div>
                                <span class="break-all">${s.personal.email}</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                    <i data-lucide="phone" class="w-4 h-4"></i>
                                </div>
                                <span>${s.personal.phone}</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                    <i data-lucide="map-pin" class="w-4 h-4"></i>
                                </div>
                                <span>${s.personal.location}</span>
                            </div>
                            ${s.personal.linkedin ? `
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                    <i data-lucide="linkedin" class="w-4 h-4"></i>
                                </div>
                                <a href="https://${s.personal.linkedin.replace(/^https?:\/\//, '')}" target="_blank" class="hover:text-indigo-600 truncate">${s.personal.linkedin}</a>
                            </div>` : ''}
                        </div>
                    </div>

                     <div>
                        <h4 class="font-bold text-indigo-600 uppercase tracking-widest text-xs mb-4">Skills</h4>
                        <div class="flex flex-wrap gap-2">
                            ${s.skills.split(',').map(skill => skill.trim()).filter(Boolean).map(skill => `
                                <span class="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-full font-bold">${skill}</span>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                         <h4 class="font-bold text-indigo-600 uppercase tracking-widest text-xs mb-4">Education</h4>
                         ${s.education.map(e => `
                            <div class="mb-4 last:mb-0">
                                <div class="font-bold text-gray-900 text-sm">${e.school}</div>
                                <div class="text-xs text-gray-500 mb-1">${e.startDate} - ${e.endDate}</div>
                                <div class="text-xs font-semibold text-indigo-600">${e.degree}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="col-span-8 space-y-8">
                     <div>
                        <h4 class="font-black text-2xl text-gray-900 mb-6 flex items-center gap-3">
                            <span class="w-2 h-8 bg-indigo-600 rounded-full"></span>
                            Experience
                        </h4>
                        ${s.experience.map(e => `
                            <div class="mb-8 relative pl-8 border-l-2 border-indigo-100 hover:border-indigo-300 transition-colors last:mb-0">
                                <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-indigo-600"></div>
                                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-2">
                                    <span class="text-xl font-bold text-gray-900">${e.company}</span>
                                    <span class="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded">${e.startDate} - ${e.endDate}</span>
                                </div>
                                <div class="text-indigo-600 font-bold mb-2">${e.role}</div>
                                <div class="text-sm text-gray-600 leading-relaxed whitespace-pre-line">${e.description}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    } else if (s.template === 'minimalist') {
        p.innerHTML = `
            <div class="max-w-2xl mx-auto">
                <header class="mb-8 pb-8 border-b border-gray-200 flex justify-between items-start">
                    <div class="flex-1">
                        <h1 class="text-3xl font-medium tracking-tight text-gray-900 mb-2">${s.personal.fullName}</h1>
                        <p class="text-lg text-gray-500 mb-4">${s.personal.headline}</p>
                        <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500 font-mono">
                            <span>${s.personal.email}</span>
                            <span>${s.personal.phone}</span>
                            <span>${s.personal.location}</span>
                            ${s.personal.linkedin || s.personal.website ?
                `<span>${[s.personal.linkedin, s.personal.website].filter(Boolean).map(l => l.replace(/^https?:\/\//, '')).join(' / ')}</span>`
                : ''}
                        </div>
                    </div>
                    ${s.personal.photo ? `<img src="${s.personal.photo}" class="w-28 h-28 object-cover ml-6 grayscale opacity-90 border border-gray-200 p-1">` : ''}
                </header>

                <section class="mb-8">
                    <h2 class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Experience</h2>
                    <div class="space-y-6">
                        ${s.experience.map(e => `
                            <div>
                                <div class="flex justify-between items-baseline mb-1">
                                    <h3 class="font-medium text-gray-900">${e.role}, ${e.company}</h3>
                                    <span class="font-mono text-xs text-gray-400">${e.startDate} — ${e.endDate}</span>
                                </div>
                                <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line">${e.description}</p>
                            </div>
                        `).join('')}
                    </div>
                </section>
                
                 <section class="mb-8">
                    <h2 class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Education</h2>
                    <div class="space-y-4">
                        ${s.education.map(e => `
                            <div class="flex justify-between items-baseline">
                                <div>
                                    <div class="font-medium text-gray-900">${e.school}</div>
                                    <div class="text-sm text-gray-600">${e.degree}</div>
                                </div>
                                <span class="font-mono text-xs text-gray-400">${e.startDate} — ${e.endDate}</span>
                            </div>
                        `).join('')}
                    </div>
                </section>

                <section>
                    <h2 class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Skills</h2>
                    <p class="text-sm text-gray-600 leading-relaxed font-mono">
                        ${s.skills.split(',').map(skill => skill.trim()).join('  •  ')}
                    </p>
                </section>
            </div>
         `;
    } else {
        // Modern Template (Default / Fallback)
        p.innerHTML = `
            <div class="flex justify-between items-start mb-8 pb-6 border-b border-gray-200 gap-6">
                <div class="flex items-center gap-6 flex-1">
                    ${s.personal.photo ? `<img src="${s.personal.photo}" class="w-32 h-32 rounded-2xl object-cover shadow-sm border border-gray-100">` : ''}
                    <div>
                        <h1 class="text-5xl font-bold mb-2 text-gray-900 tracking-tight" style="font-family: 'Outfit', sans-serif;">${s.personal.fullName}</h1>
                        <p class="text-xl text-primary font-medium tracking-wide text-indigo-600">${s.personal.headline}</p>
                    </div>
                </div>
                <div class="text-right text-sm text-gray-500 space-y-1">
                    <div class="flex items-center justify-end gap-2">
                         <span>${s.personal.email}</span>
                         <i data-lucide="mail" class="w-3 h-3"></i>
                    </div>
                    <div class="flex items-center justify-end gap-2">
                         <span>${s.personal.phone}</span>
                         <i data-lucide="phone" class="w-3 h-3"></i>
                    </div>
                    <div class="flex items-center justify-end gap-2">
                         <span>${s.personal.location}</span>
                         <i data-lucide="map-pin" class="w-3 h-3"></i>
                    </div>
                    ${s.personal.linkedin ? `
                    <div class="flex items-center justify-end gap-2">
                         <a href="https://${s.personal.linkedin.replace(/^https?:\/\//, '')}" target="_blank" class="hover:underline text-blue-600">${s.personal.linkedin}</a>
                         <i data-lucide="linkedin" class="w-3 h-3"></i>
                    </div>` : ''}
                    ${s.personal.website ? `
                    <div class="flex items-center justify-end gap-2">
                         <a href="https://${s.personal.website.replace(/^https?:\/\//, '')}" target="_blank" class="hover:underline text-blue-600">${s.personal.website}</a>
                         <i data-lucide="globe" class="w-3 h-3"></i>
                    </div>` : ''}
                </div>
            </div>
            
            <div class="grid grid-cols-[2fr_1fr] gap-8">
                <div>
                     <h3 class="font-bold mb-4 uppercase text-sm tracking-wider text-gray-400 flex items-center gap-2">
                        <i data-lucide="briefcase" class="w-4 h-4"></i> Experience
                     </h3>
                    ${s.experience.map(e => `
                        <div class="mb-6 group">
                            <div class="flex justify-between items-baseline mb-1">
                                <span class="text-lg font-bold text-gray-800">${e.company}</span>
                                <span class="text-xs font-semibold bg-gray-100 px-2 py-1 rounded text-gray-600">${e.startDate} - ${e.endDate}</span>
                            </div>
                            <div class="text-indigo-600 font-medium text-sm mb-2">${e.role}</div>
                            <div class="text-sm text-gray-600 leading-relaxed whitespace-pre-line">${e.description}</div>
                        </div>
                    `).join('')}
                </div>

                <div>
                    <div class="mb-8">
                        <h3 class="font-bold mb-4 uppercase text-sm tracking-wider text-gray-400 flex items-center gap-2">
                            <i data-lucide="graduation-cap" class="w-4 h-4"></i> Education
                        </h3>
                        ${s.education.map(e => `
                            <div class="mb-4">
                                <div class="font-bold text-gray-800">${e.school}</div>
                                <div class="text-sm text-gray-500 mb-1">${e.startDate} - ${e.endDate}</div>
                                <div class="text-sm font-medium text-indigo-600">${e.degree}</div>
                            </div>
                        `).join('')}
                    </div>

                    <div>
                        <h3 class="font-bold mb-4 uppercase text-sm tracking-wider text-gray-400 flex items-center gap-2">
                            <i data-lucide="wrench" class="w-4 h-4"></i> Skills
                        </h3>
                        <div class="flex flex-wrap gap-2">
                            ${s.skills.split(',').map(skill => skill.trim()).filter(Boolean).map(skill => `
                                <span class="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-medium border border-indigo-100">${skill}</span>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    if (window.lucide) lucide.createIcons();

    // Calculate Rezi Score
    calculateReziScore(s);
}

function calculateReziScore(s) {
    let score = 0;
    let total = 0;

    // 1. Personal (20 pts)
    const personalFields = ['fullName', 'email', 'phone', 'location', 'headline'];
    total += personalFields.length;
    personalFields.forEach(f => {
        if (s.personal[f] && s.personal[f].length > 3) score++;
    });

    // 2. Experience (40 pts)
    // Assuming ideal is 2 experiences with decent description
    total += 6; // 2 items * (company + role + desc)
    if (s.experience.length > 0) {
        s.experience.forEach(e => {
            if (e.company) score++;
            if (e.role) score++;
            if (e.description && e.description.length > 50) score++;
        });
    }

    // 3. Education (20 pts)
    total += 3;
    if (s.education.length > 0) {
        s.education.forEach(e => {
            if (e.school) score++;
            if (e.degree) score++;
            if (e.startDate) score++;
        });
    }

    // 4. Skills (20 pts)
    total += 1;
    if (s.skills && s.skills.length > 10) score++;


    // Normalize to 100
    // Simple mock logic for now to make it feel "smart"
    // If total > 0
    let finalScore = Math.round((score / total) * 100);
    if (finalScore > 100) finalScore = 100;
    // Boost score slightly for user satisfaction if they have data
    if (finalScore > 20 && finalScore < 90) finalScore += 10;
    if (finalScore > 100) finalScore = 100;

    // Update UI
    const scoreText = document.getElementById('rezi-score-text');
    const scoreCircle = document.getElementById('rezi-score-circle');

    if (scoreText) scoreText.innerText = finalScore;

    if (scoreCircle) {
        const radius = 14;
        const circumference = 2 * Math.PI * radius; // ~88
        const offset = circumference - (finalScore / 100) * circumference;
        scoreCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        scoreCircle.style.strokeDashoffset = offset;

        // Color coding
        if (finalScore < 50) scoreCircle.classList.replace('text-blue-600', 'text-red-500');
        else if (finalScore < 80) scoreCircle.classList.replace('text-red-500', 'text-yellow-500');
        else {
            scoreCircle.classList.remove('text-red-500', 'text-yellow-500');
            scoreCircle.classList.add('text-green-500');
        }
    }
}

window.addSkill = (skill) => {
    console.log('Adding skill:', skill);
    const currentSkills = store.state.skills || '';
    if (currentSkills.includes(skill)) return;

    const separator = currentSkills.length > 0 ? ', ' : '';
    const newSkills = currentSkills + separator + skill;
    store.setState({ skills: newSkills });

    // Update textarea visually if not re-rendered automatically (simpler than full re-render)
    const textarea = document.querySelector('textarea[data-model="skills"]');
    if (textarea) textarea.value = newSkills;
};

window.toggleNotifications = () => {
    alert("🔔 No new notifications.");
};

// === Localization / Translations ===
const translations = {
    en: {
        "nav.contact": "Contact Info",
        "nav.experience": "Experience",
        "nav.education": "Education",
        "nav.skills": "Skills",
        "action.save": "Save",
        "action.load": "Load",
        "section.personal.title": "Personal Details",
        "section.personal.desc": "Your basic contact information.",
        "label.fullname": "Full Name",
        "label.headline": "Headline",
        "label.email": "Email",
        "label.phone": "Phone",
        "label.location": "Location",
        "label.website": "Website",
        "section.experience.title": "Experience",
        "section.experience.desc": "Add your work history.",
        "action.add_position": "Add Position",
        "section.education.title": "Education",
        "section.education.desc": "Add your academic background.",
        "action.add_education": "Add Education",
        "section.skills.title": "Skills",
        "section.skills.desc": "List your technical skills.",
        "label.skills_list": "Skills (Comma Separated)",
        "label.suggestions": "Suggestions",
        "action.download_pdf": "Download PDF"
    },
    tr: {
        "nav.contact": "İletişim",
        "nav.experience": "Deneyim",
        "nav.education": "Eğitim",
        "nav.skills": "Yetenekler",
        "action.save": "Kaydet",
        "action.load": "Yükle",
        "section.personal.title": "Kişisel Bilgiler",
        "section.personal.desc": "Temel iletişim bilgileriniz.",
        "label.fullname": "Ad Soyad",
        "label.headline": "Ünvan",
        "label.email": "E-posta",
        "label.phone": "Telefon",
        "label.location": "Konum",
        "label.website": "Web Sitesi",
        "section.experience.title": "İş Deneyimi",
        "section.experience.desc": "Çalışma geçmişinizi ekleyin.",
        "action.add_position": "Pozisyon Ekle",
        "section.education.title": "Eğitim",
        "section.education.desc": "Akademik geçmişinizi ekleyin.",
        "action.add_education": "Okul Ekle",
        "section.skills.title": "Yetenekler",
        "section.skills.desc": "Teknik yeteneklerinizi listeleyin.",
        "label.skills_list": "Yetenekler (Virgülle ayırın)",
        "label.suggestions": "Öneriler",
        "action.download_pdf": "PDF İndir"
    },
    ru: {
        "nav.contact": "Контакты",
        "nav.experience": "Опыт",
        "nav.education": "Образование",
        "nav.skills": "Навыки",
        "action.save": "Сохранить",
        "action.load": "Загрузить",
        "section.personal.title": "Личные Данные",
        "section.personal.desc": "Ваша контактная информация.",
        "label.fullname": "ФИО",
        "label.headline": "Должность",
        "label.email": "Email",
        "label.phone": "Телефон",
        "label.location": "Адрес",
        "label.website": "Вебсайт",
        "section.experience.title": "Опыт Работы",
        "section.experience.desc": "Добавьте историю работы.",
        "action.add_position": "Добавить Позицию",
        "section.education.title": "Образование",
        "section.education.desc": "Добавьте учебные заведения.",
        "action.add_education": "Добавить Образование",
        "section.skills.title": "Навыки",
        "section.skills.desc": "Перечислите ваши навыки.",
        "label.skills_list": "Навыки (через запятую)",
        "label.suggestions": "Предложения",
        "action.download_pdf": "Скачать PDF"
    },
    fr: {
        "nav.contact": "Contact",
        "nav.experience": "Expérience",
        "nav.education": "Éducation",
        "nav.skills": "Compétences",
        "action.save": "Sauvegarder",
        "action.load": "Charger",
        "section.personal.title": "Détails personnels",
        "section.personal.desc": "Vos coordonnées de base.",
        "label.fullname": "Nom complet",
        "label.headline": "Titre",
        "label.email": "Email",
        "label.phone": "Téléphone",
        "label.location": "Adresse",
        "label.website": "Site web",
        "section.experience.title": "Expérience",
        "section.experience.desc": "Ajoutez votre historique professionnel.",
        "action.add_position": "Ajouter un poste",
        "section.education.title": "Éducation",
        "section.education.desc": "Ajoutez votre parcours académique.",
        "action.add_education": "Ajouter une formation",
        "section.skills.title": "Compétences",
        "section.skills.desc": "Listez vos compétences techniques.",
        "label.skills_list": "Compétences (séparées par des virgules)",
        "label.suggestions": "Suggestions",
        "action.download_pdf": "Télécharger PDF"
    },
    de: {
        "nav.contact": "Kontakt",
        "nav.experience": "Erfahrung",
        "nav.education": "Ausbildung",
        "nav.skills": "Fähigkeiten",
        "action.save": "Speichern",
        "action.load": "Laden",
        "section.personal.title": "Persönliche Daten",
        "section.personal.desc": "Ihre grundlegenden Kontaktinformationen.",
        "label.fullname": "Vollständiger Name",
        "label.headline": "Titel",
        "label.email": "E-Mail",
        "label.phone": "Telefon",
        "label.location": "Ort",
        "label.website": "Webseite",
        "section.experience.title": "Berufserfahrung",
        "section.experience.desc": "Fügen Sie Ihren beruflichen Werdegang hinzu.",
        "action.add_position": "Position hinzufügen",
        "section.education.title": "Ausbildung",
        "section.education.desc": "Fügen Sie Ihren akademischen Hintergrund hinzu.",
        "action.add_education": "Ausbildung hinzufügen",
        "section.skills.title": "Fähigkeiten",
        "section.skills.desc": "Listen Sie Ihre technischen Fähigkeiten auf.",
        "label.skills_list": "Fähigkeiten (kommagetrennt)",
        "label.suggestions": "Vorschläge",
        "action.download_pdf": "PDF herunterladen"
    },
    pt: {
        "nav.contact": "Contato",
        "nav.experience": "Experiência",
        "nav.education": "Educação",
        "nav.skills": "Habilidades",
        "action.save": "Salvar",
        "action.load": "Carregar",
        "section.personal.title": "Dados Pessoais",
        "section.personal.desc": "Suas informações básicas de contato.",
        "label.fullname": "Nome Completo",
        "label.headline": "Título",
        "label.email": "E-mail",
        "label.phone": "Telefone",
        "label.location": "Localização",
        "label.website": "Site",
        "section.experience.title": "Experiência",
        "section.experience.desc": "Adicione seu histórico profissional.",
        "action.add_position": "Adicionar Posição",
        "section.education.title": "Educação",
        "section.education.desc": "Adicione sua formação acadêmica.",
        "action.add_education": "Adicionar Formação",
        "section.skills.title": "Habilidades",
        "section.skills.desc": "Liste suas habilidades técnicas.",
        "label.skills_list": "Habilidades (separadas por vírgula)",
        "label.suggestions": "Sugestões",
        "action.download_pdf": "Baixar PDF"
    }
};

window.changeLanguage = (lang) => {
    const t = translations[lang] || translations['en'];

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.textContent = t[key];
        }
    });

    // Save preference
    localStorage.setItem('preferredLanguage', lang);
};

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initApp();
        initLanguage();
    });
} else {
    initApp();
    initLanguage();
}

function initLanguage() {
    const savedLang = localStorage.getItem('preferredLanguage');
    const browserLang = navigator.language.split('-')[0];
    const defaultLang = savedLang || (translations[browserLang] ? browserLang : 'en');

    // Set selection
    const langSelect = document.getElementById('language-select');
    if (langSelect) {
        langSelect.value = defaultLang;
        window.changeLanguage(defaultLang);
    }
}

// ==========================================
// 8. PDF EXPORT (Using html2pdf.js)
// ==========================================
async function downloadPdf() {
    // 1. Get the element
    const element = document.getElementById('resume-preview-content');
    if (!element) return;

    // 2. Button State (Loading) - Handle multiple buttons (Header & Preview Panel)
    const btns = document.querySelectorAll('button[title="Save as PDF"]');
    const originalContents = new Map(); // Store original HTML for each button

    btns.forEach(btn => {
        originalContents.set(btn, btn.innerHTML);
        btn.disabled = true;
        // Check if it's the "icon only" or "text+icon" button to adjust text?
        // For now, simple spinner + text is fine.
        btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span class="hidden sm:inline">Generating...</span>`;
    });

    if (window.lucide) {
        try { lucide.createIcons(); } catch (e) { }
    }

    // 3. Configuration
    const opt = {
        margin: [0, 0, 0, 0], // Top, Left, Bottom, Right
        filename: (store.state.resumeTitle || 'Resume').replace(/[^a-z0-9]/yi, '_') + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 4. Generate
    try {
        if (typeof html2pdf === 'undefined') {
            throw new Error('html2pdf library not loaded');
        }
        await html2pdf().set(opt).from(element).save();
    } catch (error) {
        console.error('PDF Generation Failed:', error);
        alert('Failed to generate PDF. Please try "Print to PDF" instead.');
    } finally {
        // 5. Restore Buttons
        btns.forEach(btn => {
            if (originalContents.has(btn)) {
                btn.innerHTML = originalContents.get(btn);
                btn.disabled = false;
            }
        });

        // Delay slightly to ensure browser repaints
        setTimeout(() => {
            if (window.lucide) lucide.createIcons();
        }, 100);
    }
}

// ==========================================
// 8. SHARE & ANALYTICS
// ==========================================
async function shareCvLink() {
    // 1. Init Supabase
    if (!window.supabase) {
        alert('Supabase client not loaded. Please refresh.');
        return;
    }
    const supabaseUrl = window.APP_CONFIG?.SUPABASE?.URL;
    const supabaseKey = window.APP_CONFIG?.SUPABASE?.ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        alert('Configuration missing.');
        return;
    }

    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    // 2. Button State
    const btn = document.querySelector('button[onclick="shareCvLink()"]');
    const originalHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = `<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> Generating...`;
        btn.disabled = true;
        lucide.createIcons();
    }

    try {
        // 3. Save to Supabase
        // We insert a new record to ensure a clean public share state
        const { data, error } = await supabase
            .from('resumes')
            .insert({
                content: store.state,
                // We could add user_id here if we had auth context
            })
            .select()
            .single();

        if (error) throw error;

        // 4. Show Modal
        // Calculate base URL to support subdirectories (like GitHub Pages)
        const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
        const link = `${baseUrl}/share.html?id=${data.id}`;
        showShareModal(link);

    } catch (err) {
        console.error('Share Failed:', err);
        alert('Failed to generate link. check console for details.');
    } finally {
        if (btn) {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
            lucide.createIcons();
        }
    }
}

function showShareModal(link) {
    // Check if modal exists
    let modal = document.getElementById('share-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'share-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative mx-4">
                <button onclick="document.getElementById('share-modal').classList.add('hidden')" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
                <div class="text-center mb-6">
                    <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i data-lucide="share-2" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-lg font-bold text-gray-900">Share your CV</h3>
                    <p class="text-sm text-gray-500">Link stays active for 7 days.</p>
                </div>
                
                <div class="flex items-center gap-2 mb-4 bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <input type="text" readonly value="${link}" class="bg-transparent border-none text-sm text-gray-600 w-full focus:ring-0 truncate" id="share-link-input">
                    <button onclick="copyShareLink()" class="text-indigo-600 hover:text-indigo-800 font-bold text-xs whitespace-nowrap px-2">
                        Copy
                    </button>
                </div>
                
                <div class="flex gap-3">
                    <a href="${link}" target="_blank" class="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                        Open Link <i data-lucide="external-link" class="w-4 h-4"></i>
                    </a>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        const input = modal.querySelector('input');
        const linkBtn = modal.querySelector('a');
        if (input) input.value = link;
        if (linkBtn) linkBtn.href = link;
        modal.classList.remove('hidden');
    }
    lucide.createIcons();
}

function copyShareLink() {
    const input = document.getElementById('share-link-input');
    input.select();
    document.execCommand('copy');
    // Visual feedback could be added here
}
