/* global chrome */
console.log('script running...')

const url = import.meta.env.VITE_MATCH_JOB_URL
const ACTIONS = ['APPLY', 'APPLY_WITH_TAILORING', 'SKIP']

const getInstallationId = async () => {
    let { installId } = await chrome.storage.local.get('installId')
    if (typeof installId !== 'string' || !installId) {
        installId = crypto.randomUUID()
        await chrome.storage.local.set({ installId })
    }
    return installId
}

const getCurrentJobData = () => {
    const jobHeader = document.querySelector('[data-testid="desktop-job-header"]')
    const jobContent = document.querySelector('[data-testid="viewjob-job-content"]')
    if (!jobHeader || !jobContent) return {}

    const summaryDiv = jobContent.querySelector('[data-testid="structured-job-summary"]')
    const jd = jobContent.children[2]
    if (!summaryDiv || !jd) return {}

    const headerArray = getTextFromElement(jobHeader) || []
    const headerText = headerArray.map(e => e.html).join("\n")
    const summaryArray = getTextFromElement(summaryDiv) || []
    const jobSummary = summaryArray.map((e) => e.html).join("\n")

    const jdArray = getTextFromElement(jd) || []
    const jobDescription = jdArray.map(e => e.html).join("\n")

    return { headerText, jobSummary, jobDescription }
}
const getTextFromElement = (element, data = []) => {
    if (!element || element.innerHTML.length === 0) return data;

    if (element.children?.length > 0) {
        for (const child of element.children) {
            getTextFromElement(child, data)
        }
    } else {
        if (element.tagName !== "STYLE")
            data.push({ tagName: element.tagName, html: element.innerHTML.trim() })
    }

    return data
}
const checkJobFit = async () => {
    try {
        const { resume } = await chrome.storage.local.get('resume');
        if (!resume) return

        const { headerText, jobDescription, jobSummary } = getCurrentJobData()
        if (!(headerText && jobDescription && jobSummary)) return

        const completeJD = `\n${headerText}\n${jobSummary}\n${jobDescription}`
        const installId = await getInstallationId()

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-install-id': installId
            },
            body: JSON.stringify({ resume, jobDescription: completeJD })
        })

        if (response.status === 429) {
            return { rateLimited: true, status: 429 }
        }

        const data = await response.json()
        if (!response.ok) throw new Error(data.error?.message ?? `Request failed with status ${response.status}`)
        return data
    } catch (error) {
        console.error('Job fit request failed:', error)
    }
}

const idleGif = chrome.runtime.getURL('public/animations/beaver-idle.gif')
const scoutingGif = chrome.runtime.getURL('public/animations/beaver-scouting.gif')
const hmmGif = chrome.runtime.getURL('public/animations/beaver-hmm.gif')

const ACTION_CONFIG = {
    [ACTIONS[0]]: {
        gif: chrome.runtime.getURL('public/animations/beaver-match.gif'),
        label: 'Apply Now',
        badgeBg: '#22C55E',
        badgeColor: '#331304',
        ringBg: '#DCFCE7',
        btnBg: '#15803D',
        btnHoverBg: '#166534'
    },
    [ACTIONS[1]]: {
        gif: chrome.runtime.getURL('public/animations/beaver-tailor.gif'),
        label: 'Apply with Tailoring',
        badgeBg: '#FACC15',
        badgeColor: '#331304',
        ringBg: '#FEF9C3',
        btnBg: '#D97706',
        btnHoverBg: '#B45309'
    },
    [ACTIONS[2]]: {
        gif: hmmGif,
        label: 'Skip Job',
        badgeBg: '#F87171',
        badgeColor: '#331304',
        ringBg: '#FEE2E2',
        btnBg: '#B91C1C',
        btnHoverBg: '#991B1B'
    }
}

let latestReport = null
let isRateLimited = false
let isDetailsOpen = false
let isFetching = false
let currentJobSignature = null
let rootWrapper = null
let resetBeavieUI = null

const initBeavieWidget = () => {
    if (rootWrapper) return

    rootWrapper = document.createElement('div')
    rootWrapper.style.cssText = `
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #331304;
    `

    const div = document.createElement('div')
    const avatarWrap = document.createElement('div')
    const beaver = document.createElement('img')
    const badge = document.createElement('span')
    const button = document.createElement('button')
    const loader = document.createElement('progress')
    const closeBtn = document.createElement('button')

    div.style.cssText = `
        position: relative;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 28px 6px 6px;
        background: #FFFDF9;
        border: 3px solid #331304;
        border-radius: 999px;
        box-shadow: 0 4px 0 #331304, 0 8px 20px rgba(51, 19, 4, 0.22);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
    `

    avatarWrap.style.cssText = `
        position: relative;
        width: 54px;
        height: 54px;
        border-radius: 50%;
        background: #FFF3E0;
        border: 2.5px solid #331304;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: visible;
        transition: transform 0.15s ease, background 0.2s ease, box-shadow 0.15s ease;
    `

    beaver.src = idleGif
    beaver.alt = 'Beavie'
    beaver.title = 'Beavie identified this job posting!'
    beaver.style.cssText = `
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: contain;
        display: block;
        pointer-events: none;
    `

    badge.textContent = 'AI'
    badge.style.cssText = `
        position: absolute;
        bottom: -3px;
        right: -3px;
        padding: 1px 6px;
        background: #22C55E;
        color: #331304;
        border: 2px solid #331304;
        border-radius: 999px;
        font-size: 9.5px;
        font-weight: 900;
        letter-spacing: 0.03em;
        line-height: 1.2;
        white-space: nowrap;
    `

    button.type = 'button'
    button.textContent = 'Check if this job is a good fit'
    button.style.cssText = `
        padding: 9px 14px;
        border: 2.5px solid #331304;
        border-radius: 999px;
        background: #DE7C32;
        color: #FFFDF9;
        cursor: pointer;
        font: 700 13px/1.2 system-ui, -apple-system, sans-serif;
        letter-spacing: 0.01em;
        box-shadow: 0 2px 0 #331304;
        transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.1s ease;
    `

    // Small X (cross) at top-right to close the whole widget
    closeBtn.type = 'button'
    closeBtn.innerHTML = '&#10005;'
    closeBtn.title = 'Close Scouting Beaver'
    closeBtn.setAttribute('aria-label', 'Close Scouting Beaver')
    closeBtn.style.cssText = `
        position: absolute;
        top: -7px;
        right: -7px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2.5px solid #331304;
        background: #FFFDF9;
        color: #331304;
        font-size: 11px;
        font-weight: 900;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 0 #331304;
        padding: 0;
        transition: background 0.15s ease, transform 0.1s ease;
    `
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = '#FEE2E2'
        closeBtn.style.transform = 'scale(1.08)'
    })
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = '#FFFDF9'
        closeBtn.style.transform = 'scale(1)'
    })
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        rootWrapper.style.display = 'none'
    })

    const getActiveCfg = () => {
        const action = latestReport?.recommendation?.action
        return ACTION_CONFIG[action] || null
    }

    const updateButtonLabelAndColor = () => {
        if (isRateLimited) {
            const toggleHint = isDetailsOpen ? 'Hide ▲' : 'Info ▼'
            button.textContent = `Daily limit exhausted. Come back tomorrow! (${toggleHint})`
            button.style.background = '#B91C1C'
            return
        }
        if (!latestReport) {
            button.textContent = 'Check if this job is a good fit'
            button.style.background = '#DE7C32'
            return
        }
        const cfg = getActiveCfg()
        const actionTitle = cfg ? cfg.label : 'Analysis Complete'
        const toggleHint = isDetailsOpen ? 'Hide details ▲' : 'Show details ▼'
        button.textContent = `${actionTitle}. ${toggleHint}`
        button.style.background = cfg ? cfg.btnBg : '#DE7C32'
    }

    button.addEventListener('mouseenter', () => {
        if (!button.disabled) {
            if (isRateLimited) {
                button.style.background = '#991B1B'
            } else {
                const cfg = getActiveCfg()
                button.style.background = cfg ? cfg.btnHoverBg : '#C96824'
            }
            button.style.transform = 'translateY(-1px)'
            button.style.boxShadow = '0 3px 0 #331304'
        }
    })
    button.addEventListener('mouseleave', () => {
        if (!button.disabled) {
            if (isRateLimited) {
                button.style.background = '#B91C1C'
            } else {
                const cfg = getActiveCfg()
                button.style.background = cfg ? cfg.btnBg : '#DE7C32'
            }
            button.style.transform = 'translateY(0)'
            button.style.boxShadow = '0 2px 0 #331304'
        }
    })

    loader.setAttribute('aria-label', 'Checking job fit')
    loader.hidden = true
    loader.style.cssText = `
        width: 56px;
        height: 10px;
        accent-color: #22C55E;
        border-radius: 999px;
        margin-right: 4px;
    `

    // Collapsible Details Container
    const detailsContainer = document.createElement('div')
    detailsContainer.hidden = true
    detailsContainer.style.cssText = `
        width: 370px;
        max-width: calc(100vw - 32px);
        max-height: 75vh;
        overflow-y: auto;
        background: #FFFDF9;
        border: 3px solid #331304;
        border-radius: 20px;
        box-shadow: 0 6px 0 #331304, 0 14px 32px rgba(51, 19, 4, 0.28);
        padding: 16px;
        display: none;
        flex-direction: column;
        gap: 14px;
        box-sizing: border-box;
    `

    const escapeHtml = (str = '') =>
        String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')

    const toggleDetails = () => {
        if (!latestReport && !isRateLimited) return
        isDetailsOpen = !isDetailsOpen
        detailsContainer.hidden = !isDetailsOpen
        detailsContainer.style.display = isDetailsOpen ? 'flex' : 'none'
        updateButtonLabelAndColor()
    }

    const renderRateLimitNotice = () => {
        detailsContainer.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:10px;border-bottom:2px dashed #FECACA;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="padding:3px 9px;border-radius:999px;background:#F87171;color:#331304;border:2px solid #331304;font-size:11px;font-weight:900;letter-spacing:0.03em;text-transform:uppercase;">
                        Daily Limit Reached
                    </span>
                </div>
                <button type="button" id="beavie-collapse-btn" title="Collapse notice" style="padding:4px 8px;border-radius:8px;border:2px solid #331304;background:#FFF3E0;color:#331304;font-size:11px;font-weight:800;cursor:pointer;box-shadow:0 2px 0 #331304;">
                    Hide &#9650;
                </button>
            </div>
            <div style="padding:12px;border-radius:12px;background:#FFF8F6;border:2px solid #331304;font-size:13px;line-height:1.45;color:#331304;font-weight:600;">
                You have exhausted your daily job-scouting limit for today! Beavie is resting up, please come back tomorrow to check more job openings.
            </div>
        `
        const collapseBtn = detailsContainer.querySelector('#beavie-collapse-btn')
        if (collapseBtn) {
            collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                toggleDetails()
            })
        }
    }

    const renderDetails = (report) => {
        const score = report.matchScore ?? 0
        const verdict = (report.verdict || '').toUpperCase()
        const action = report.recommendation?.action || ''
        const advice = report.recommendation?.advice || ''
        const matches = Array.isArray(report.matches) ? report.matches : []
        const misses = Array.isArray(report.misses) ? report.misses : []

        const cfg = ACTION_CONFIG[action] || {
            label: action.replace(/_/g, ' ') || 'Analysis Complete',
            badgeBg: '#E6E1DA',
            badgeColor: '#331304',
            ringBg: '#FFF3E0'
        }

        const matchesHtml = matches.length
            ? matches.map(m => `
                <li style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:10px;font-size:12.5px;line-height:1.4;">
                    <span style="padding:2px 6px;border-radius:6px;background:#DCFCE7;border:1px solid #86EFAC;font-size:10px;font-weight:800;text-transform:uppercase;color:#14532D;flex-shrink:0;margin-top:1px;">
                        ${escapeHtml(m.category || 'match')}
                    </span>
                    <span style="color:#331304;font-weight:500;">${escapeHtml(m.detail)}</span>
                </li>
            `).join('')
            : `<li style="font-size:12px;color:#7B310B;">No specific matches found.</li>`

        const missesHtml = misses.length
            ? misses.map(m => {
                const isReq = String(m.severity).toLowerCase() === 'required'
                const sevBg = isReq ? '#FEE2E2' : '#FEF3C7'
                const sevBorder = isReq ? '#FCA5A5' : '#FDE68A'
                const sevColor = isReq ? '#991B1B' : '#92400E'
                return `
                    <li style="display:flex; flex-direction:column; gap:5px; padding:8px 10px; background:#FFF8F6; border:1.5px solid #FECACA; border-radius:10px; font-size:12.5px; line-height:1.4;">
                        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                            <span style="padding:2px 6px; border-radius:6px; background:#FFEDD5; border:1px solid #FDBA74; font-size:10px; font-weight:800; text-transform:uppercase; color:#7C2D12;">
                                ${escapeHtml(m.category || 'gap')}
                            </span>
                            ${m.severity ? `
                                <span style="padding:2px 6px; border-radius:6px; background:${sevBg}; border:1px solid ${sevBorder}; font-size:10px; font-weight:800; text-transform:uppercase; color:${sevColor};">
                                    ${escapeHtml(m.severity)}
                                </span>
                            ` : ''}
                        </div>
                        <span style="color:#331304; font-weight:500;">${escapeHtml(m.detail)}</span>
                    </li>
                `
            }).join('')
            : `<li style="font-size:12px;color:#15803D;">No missing requirements spotted!</li>`

        detailsContainer.innerHTML = `
            <!-- Header: Score, Verdict, Recommendation Pill & Collapse Button -->
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:12px;border-bottom:2px dashed #E6E1DA;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:54px;height:54px;border-radius:14px;background:${cfg.ringBg};border:2.5px solid #331304;box-shadow:0 3px 0 #331304;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
                        <span style="font-size:17px;font-weight:900;line-height:1;color:#331304;">${escapeHtml(score)}%</span>
                        <span style="font-size:9px;font-weight:800;text-transform:uppercase;color:#7B310B;margin-top:2px;">${escapeHtml(verdict || 'FIT')}</span>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px;">
                        <span style="align-self:flex-start;padding:3px 9px;border-radius:999px;background:${cfg.badgeBg};color:${cfg.badgeColor};border:2px solid #331304;font-size:11px;font-weight:900;letter-spacing:0.03em;text-transform:uppercase;">
                            ${escapeHtml(cfg.label)}
                        </span>
                        <span style="font-size:11.5px;color:#7B310B;font-weight:600;">
                            Match Analysis Report
                        </span>
                    </div>
                </div>
                <button type="button" id="beavie-collapse-btn" title="Collapse details" style="padding:5px 9px;border-radius:8px;border:2px solid #331304;background:#FFF3E0;color:#331304;font-size:11px;font-weight:800;cursor:pointer;box-shadow:0 2px 0 #331304;">
                    Hide &#9650;
                </button>
            </div>

            <!-- Advice Section -->
            ${advice ? `
                <div style="padding:10px 12px;border-radius:12px;background:#FFF3E0;border:2px solid #331304;font-size:12.5px;line-height:1.45;">
                    <div style="font-size:10.5px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:#7B310B;margin-bottom:4px;">
                        Beavie's Advice
                    </div>
                    <div style="color:#331304;font-weight:600;">
                        ${escapeHtml(advice)}
                    </div>
                </div>
            ` : ''}

            <!-- Matches Section -->
            <div style="display:flex;flex-direction:column;gap:7px;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <span style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.04em;color:#15803D;">
                        &#10003; Profile Matches (${matches.length})
                    </span>
                </div>
                <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px;">
                    ${matchesHtml}
                </ul>
            </div>

            <!-- Misses Section -->
            <div style="display:flex;flex-direction:column;gap:7px;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <span style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.04em;color:#B91C1C;">
                        &#9888; Missing / Gaps (${misses.length})
                    </span>
                </div>
                <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px;">
                    ${missesHtml}
                </ul>
            </div>
        `

        const collapseBtn = detailsContainer.querySelector('#beavie-collapse-btn')
        if (collapseBtn) {
            collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                toggleDetails()
            })
        }
    }

    // Reset function called whenever the user switches to a different job opening on Indeed
    resetBeavieUI = () => {
        latestReport = null
        isRateLimited = false
        isDetailsOpen = false
        isFetching = false

        detailsContainer.hidden = true
        detailsContainer.style.display = 'none'
        detailsContainer.innerHTML = ''

        beaver.src = idleGif
        avatarWrap.style.background = '#FFF3E0'
        badge.textContent = 'AI'
        badge.style.background = '#22C55E'
        badge.style.color = '#331304'

        button.disabled = false
        button.style.cursor = 'pointer'
        loader.hidden = true
        updateButtonLabelAndColor()

        rootWrapper.style.display = 'flex'
    }

    // Same button handles initial fetch AND toggling details once fetched
    button.addEventListener('click', async () => {
        if (isFetching) return

        // If already fetched or rate-limited for this job opening, clicking the button toggles the details container
        if (latestReport || isRateLimited) {
            toggleDetails()
            return
        }

        const activeSignatureAtStart = currentJobSignature
        isFetching = true
        button.disabled = true
        button.textContent = 'Scouting job fit...'
        button.style.background = '#7B310B'
        button.style.cursor = 'wait'
        beaver.src = scoutingGif
        avatarWrap.style.background = '#E0F2FE'
        loader.hidden = false

        try {
            const responseData = await checkJobFit()
            // Ignore stale response if the user switched to another job opening mid-fetch
            if (currentJobSignature !== activeSignatureAtStart) return

            if (responseData?.rateLimited) {
                isRateLimited = true
                beaver.src = hmmGif
                avatarWrap.style.background = '#FEE2E2'
                badge.textContent = '429'
                badge.style.background = '#F87171'
                badge.style.color = '#331304'

                renderRateLimitNotice()
                isDetailsOpen = true
                detailsContainer.hidden = false
                detailsContainer.style.display = 'flex'
                updateButtonLabelAndColor()
                return
            }

            const report = responseData?.data ?? responseData

            if (report && (report.recommendation || report.matchScore !== undefined)) {
                latestReport = report
                const action = report.recommendation?.action
                const cfg = ACTION_CONFIG[action]

                // Set the corresponding GIF based on recommendation.action
                beaver.src = cfg ? cfg.gif : idleGif
                avatarWrap.style.background = cfg ? cfg.ringBg : '#FFF3E0'

                // Update badge on icon with match score
                if (report.matchScore !== undefined) {
                    badge.textContent = `${report.matchScore}%`
                    badge.style.background = cfg ? cfg.badgeBg : '#22C55E'
                    badge.style.color = cfg ? cfg.badgeColor : '#331304'
                }

                // Populate details container (collapsed initially; clicking the same button toggles it)
                renderDetails(report)
                isDetailsOpen = false
                detailsContainer.hidden = true
                detailsContainer.style.display = 'none'
                updateButtonLabelAndColor()
            } else {
                beaver.src = idleGif
                avatarWrap.style.background = '#FFF3E0'
                updateButtonLabelAndColor()
            }
        } finally {
            if (currentJobSignature === activeSignatureAtStart) {
                isFetching = false
                button.disabled = false
                button.style.cursor = 'pointer'
                loader.hidden = true
                updateButtonLabelAndColor()
            }
        }
    })

    avatarWrap.append(beaver)
    avatarWrap.append(badge)
    div.append(avatarWrap)
    div.append(button)
    div.append(loader)
    div.append(closeBtn)

    rootWrapper.append(div)
    rootWrapper.append(detailsContainer)
    document.body.appendChild(rootWrapper)
}

// Check current job in DOM and reset/show Beavie UI whenever another job opening is selected
const syncWithJobDOM = () => {
    const { headerText, jobSummary, jobDescription } = getCurrentJobData()
    const hasValidJob = Boolean(headerText && jobSummary && jobDescription)

    if (!hasValidJob) {
        if (rootWrapper) {
            rootWrapper.style.display = 'none'
        }
        currentJobSignature = null
        return
    }

    const newSignature = `${headerText}:::${jobSummary}`
    if (!rootWrapper) {
        currentJobSignature = newSignature
        initBeavieWidget()
    } else if (newSignature !== currentJobSignature) {
        currentJobSignature = newSignature
        resetBeavieUI()
    }
}

// Initial check
syncWithJobDOM()

// Observe DOM mutations on Indeed (e.g. clicking different job cards in split-view)
let domObserverTimer = null
const observer = new MutationObserver((mutations) => {
    // Ignore mutations inside our own Beavie widget
    const isExternalMutation = mutations.some(
        (m) => !rootWrapper || !rootWrapper.contains(m.target)
    )
    if (!isExternalMutation) return

    clearTimeout(domObserverTimer)
    domObserverTimer = setTimeout(syncWithJobDOM, 150)
})

observer.observe(document.body, {
    childList: true,
    subtree: true
})
