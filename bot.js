// Save question and answer to data.xlsx
function logQAtoExcel(question, answer) {
    const XLSX = require('xlsx');
    const fs = require('fs');
    const file = 'data.xlsx';
    let ws, wb;
    if (fs.existsSync(file)) {
        wb = XLSX.readFile(file);
        ws = wb.Sheets[wb.SheetNames[0]];
    } else {
        wb = XLSX.utils.book_new();
        ws = XLSX.utils.aoa_to_sheet([['Question', 'Answer']]);
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    }
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    data.push([question, answer]);
    const newWs = XLSX.utils.aoa_to_sheet(data);
    wb.Sheets[wb.SheetNames[0]] = newWs;
    XLSX.writeFile(wb, file);
}
    // Cleanup temporary and cache folders recursively and silently
    function cleanupTempFolders() {
        const { exec } = require('child_process');
        exec('Remove-Item -Path $env:TEMP\\* -Recurse -Force', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error cleaning temp folders: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Error output: ${stderr}`);
                return;
            }
            console.log('Temporary folders cleaned successfully.');
        });
    }
// Google GenAI SDK
const { GoogleGenerativeAI } = require('@google/generative-ai');
const GEMINI_API_KEY = 'AIzaSyDhxq4_Xzz0vC85P0geecoAAOlECWS9Grg';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Test Gemini API connection
async function testGeminiAPI() {
    try {
        console.log('🧪 Testing Gemini API connection...');
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const result = await model.generateContent("Say 'Hello, API is working!'");
        const response = await result.response;
        const text = response.text();
        
        console.log('✅ Gemini API is working!', text.substring(0, 50));
        return true;
    } catch (error) {
        console.error('❌ Gemini API connection error:', error.message);
        return false;
    }
}

// Fallback function for when Gemini is not available
function getFallbackAnswer(question, faqs, lang = 'en') {
    // Simple keyword matching
    const keywords = question.toLowerCase().split(/\s+/);
    let bestMatch = null;
    let bestScore = 0;
    
    for (const faq of faqs) {
        const faqText = (faq.Question + ' ' + faq.Answer).toLowerCase();
        let score = 0;
        
        for (const keyword of keywords) {
            if (keyword.length > 2 && faqText.includes(keyword)) {
                score += keyword.length;
            }
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestMatch = faq;
        }
    }
    
    if (bestMatch && bestScore > 5) {
        return `Based on our FAQ database:\n\n**Q:** ${bestMatch.Question}\n**A:** ${bestMatch.Answer}\n\n_Note: AI assistance is currently unavailable. This is a direct FAQ match._`;
    }
    
    // Default responses for common queries
    const defaultResponses = {
        en: "I apologize, but our AI system is currently unavailable. Please contact the Animal Husbandry Department directly at +91-22-xxxx-xxxx or visit https://dahd.maharashtra.gov.in/ for assistance.",
        hi: "मुझे खुशी है कि मैं आपकी सहायता नहीं कर सकता क्योंकि हमारी AI प्रणाली वर्तमान में उपलब्ध नहीं है। कृपया पशुपालन विभाग से सीधे संपर्क करें।",
        mr: "माफ करा, आमची AI प्रणाली सध्या उपलब्ध नाही. कृपया प्राणी संवर्धन विभागाशी थेट संपर्क साधा."
    };
    
    return defaultResponses[lang] || defaultResponses.en;
}
// Returns the FAQ/Grievance options prompt in the selected language
function getOptionPrompt(lang) {
    switch (lang) {
        case 'hi':
            return 'कृपया एक विकल्प चुनें:\n1. सामान्य प्रश्न (FAQ)\n2. शिकायत दर्ज करें\nउत्तर में 1 या 2 लिखें।';
        case 'mr':
            return 'कृपया एक पर्याय निवडा:\n1. वारंवार विचारले जाणारे प्रश्न (FAQ)\n2. तक्रार नोंदवा\nउत्तरात 1 किंवा 2 लिहा.';
        default:
            return 'Please select an option:\n1. Frequently Asked Questions (FAQ)\n2. File a Grievance\nReply with 1 or 2.';
    }
}
const XLSX = require('xlsx');
const stringSimilarity = require('string-similarity');
const transliterate = require('transliteration').transliterate;

// Load FAQ data from Excel (2 columns: Question, Answer)
function loadFAQs() {
    const workbook = XLSX.readFile('faqs.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { header: ['Question', 'Answer'], range: 1 });
}
// Don't cache faqs; always reload for latest data

// Find best FAQ match
function findBestFAQ(question, lang = 'en') {
    const filtered = faqs.filter(f => !lang || f.Language === lang);
    const questions = filtered.map(f => f.Question);
    const matches = stringSimilarity.findBestMatch(question, questions);
    const bestIndex = matches.bestMatchIndex;
    const bestScore = matches.bestMatch.rating;
    if (bestScore > 0.7) { // adjust threshold as needed
        return filtered[bestIndex];
    }
    return null;
}
// Random greetings for new chats
const GREETINGS = [
    'Hi! This is the Animal Husbandry Department, Maharashtra.',
    'Hello! You are chatting with the Animal Husbandry Department, Maharashtra.',
    'Namaste! Welcome to the Animal Husbandry Department, Maharashtra.',
    'Greetings from the Animal Husbandry Department, Maharashtra!',
    'Welcome! This is the Animal Husbandry Department, Maharashtra.'
];

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const os = require('os');

// Determine Puppeteer arguments based on environment

const puppeteerArgs = [
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-extensions',
    '--disable-plugins',
    '--disable-default-apps'
];

let executablePath = undefined;

if (os.platform() === 'linux') {
    // Add Linux-specific flags for better stability
    puppeteerArgs.push('--no-sandbox', '--disable-setuid-sandbox');
    // Try common Chromium/Chrome paths for Linux
    const fs = require('fs');
    const linuxChromePaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/snap/bin/chromium'
    ];
    for (const path of linuxChromePaths) {
        if (fs.existsSync(path)) {
            executablePath = path;
            break;
        }
    }
}
// Add extra Puppeteer args for Windows stability
if (os.platform() === 'win32') {
    puppeteerArgs.push('--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox');
}
if (os.platform() === 'win32') {
    // Try common Chrome path for Windows
    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Chromium\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe'
    ];
    const fs = require('fs');
    let found = false;
    for (const path of chromePaths) {
        if (fs.existsSync(path)) {
            executablePath = path;
            found = true;
            break;
        }
    }
    // If not found, let Puppeteer use its bundled Chromium
    if (!found) {
        executablePath = undefined;
        console.log('No Chrome/Chromium found in standard locations. Falling back to Puppeteer\'s bundled Chromium.');
    }
}

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './auth_session'
    }),
    puppeteer: {
        args: puppeteerArgs,
        ...(executablePath ? { executablePath } : {}),
        headless: true,
        defaultViewport: null,
        timeout: 60000,
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code above with your WhatsApp to connect the bot.');
});

client.on('ready', () => {
    console.log('✅ WhatsApp bot is now connected and ready!');
});

client.on('authenticated', () => {
    console.log('✅ Authentication successful!');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
});

client.on('disconnected', (reason) => {
    console.log('🔌 Bot disconnected:', reason);
    console.log('🔄 Attempting to reconnect...');
});

client.on('loading_screen', (percent, message) => {
    console.log('Loading WhatsApp Web...', percent, message);
});

client.on('change_state', state => {
    console.log('🔄 Connection state changed:', state);
});

// Handle client errors
client.on('error', (error) => {
    console.error('❌ Client error:', error.message || error);
});

// In-memory user state (resets on restart)
const userState = {};

const LANGUAGES = {
    en: 'English',
    hi: 'हिन्दी',
    mr: 'मराठी'
};

const getLanguagePrompt = () =>
    `Please select your language:\n1. English\n2. हिन्दी\n3. मराठी\nReply with 1, 2, or 3.`;
client.on('message', async msg => {
    const user = msg.from;

    // Check for the '!ping' command to reset the session
    if (msg.body.trim().toLowerCase() === '!ping') {
        let bye;
        const state = userState[user];
        if (state && state.lang === 'hi') {
            bye = 'चैट समाप्त किया गया। धन्यवाद!';
        } else if (state && state.lang === 'mr') {
            bye = 'चॅट समाप्त केला. धन्यवाद!';
        } else {
            bye = 'Chat ended. Thank you!';
        }
        delete userState[user];
        await msg.reply(bye);

        // Set the state to wait for the next message before restarting
        userState[user] = { step: 'await_restart' };
        return;
    }

    // If waiting for restart after '!ping', show the language prompt on the next message
    if (userState[user] && userState[user].step === 'await_restart') {
        userState[user] = { step: 'language' };
        const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
        await msg.reply(`${greeting}\n\n${getLanguagePrompt()}`);
        return;
    }

    // If no state, start fresh
    if (!userState[user]) {
        userState[user] = { step: 'language' };
        // Use a per-user random greeting for more variety
        let hash = 0;
        for (let i = 0; i < user.length; i++) {
            hash = ((hash << 5) - hash) + user.charCodeAt(i);
            hash |= 0;
        }
        const greeting = GREETINGS[Math.abs(hash) % GREETINGS.length];
        await msg.reply(`${greeting}\n\n${getLanguagePrompt()}`);
        return;
    }
    const state = userState[user];

    // Transliterate user input to handle Minglish/Hinglish
    const input = transliterate(msg.body.trim().toLowerCase());

    // Timeout logic: if last step was a yes/no prompt and >30s passed, reset chat
    const yesNoSteps = ['faq_followup'];
    if (yesNoSteps.includes(state.step) && state.yesNoPromptTime) {
        const now = Date.now();
        if (now - state.yesNoPromptTime > 30000) {
            delete userState[user];
            return; // Do not send any message; wait for the next user input
        }
    }

    if (state.step === 'language') {
        let lang = null;
        if (input === '1') lang = 'en';
        else if (input === '2') lang = 'hi';
        else if (input === '3') lang = 'mr';
        if (!lang) {
            await msg.reply(getLanguagePrompt());
            return;
        }
        state.lang = lang;
        state.step = 'option';
        await msg.reply(getOptionPrompt(lang));
        return;
    }

    if (state.step === 'option') {
        if (msg.body === '1') {
            // FAQ selected
            let reply;
            switch (state.lang) {
                case 'hi': reply = 'कृपया अपना प्रश्न पूछें (FAQ)।'; break;
                case 'mr': reply = 'कृपया आपला प्रश्न विचारा (FAQ).'; break;
                default: reply = 'Please type your FAQ question.';
            }
            state.step = 'faq';
            await msg.reply(reply);
            return;
        } else if (msg.body === '2') {
            // Grievance selected
            let reply;
            switch (state.lang) {
                case 'hi': reply = 'शिकायत दर्ज करने के लिए कृपया इस लिंक पर जाएं: https://example.com/grievance'; break;
                case 'mr': reply = 'तक्रार नोंदविण्यासाठी कृपया या लिंकवर जा: https://example.com/grievance'; break;
                default: reply = 'To file a grievance, please visit: https://example.com/grievance';
            }
            await msg.reply(reply);
            // Instead of ending, ask if they want FAQ or grievance again
            let followup;
            switch (state.lang) {
                case 'hi': followup = 'क्या आप FAQ देखना चाहते हैं या एक और शिकायत दर्ज करना चाहते हैं?\n1. सामान्य प्रश्न (FAQ)\n2. शिकायत दर्ज करें\nउत्तर में 1 या 2 लिखें।'; break;
                case 'mr': followup = 'आपण FAQ पाहू इच्छिता किंवा आणखी एक तक्रार नोंदवू इच्छिता?\n1. वारंवार विचारले जाणारे प्रश्न (FAQ)\n2. तक्रार नोंदवा\nउत्तरात 1 किंवा 2 लिहा.'; break;
                default: followup = 'Would you like to see FAQs or file another grievance?\n1. Frequently Asked Questions (FAQ)\n2. File a Grievance\nReply with 1 or 2.';
            }
            state.step = 'post_grievance_option';
            await msg.reply(followup);
            return;
        } else {
            await msg.reply(getOptionPrompt(state.lang));
            return;
        }
    }

    // Handle post-grievance options
    if (state.step === 'post_grievance_option') {
        if (msg.body === '1') {
            // FAQ selected after grievance
            let reply;
            switch (state.lang) {
                case 'hi': reply = 'कृपया अपना प्रश्न पूछें (FAQ)।'; break;
                case 'mr': reply = 'कृपया आपला प्रश्न विचारा (FAQ).'; break;
                default: reply = 'Please type your FAQ question.';
            }
            state.step = 'faq';
            await msg.reply(reply);
            return;
        } else if (msg.body === '2') {
            // Grievance selected again
            let reply;
            switch (state.lang) {
                case 'hi': reply = 'शिकायत दर्ज करने के लिए कृपया इस लिंक पर जाएं: https://example.com/grievance'; break;
                case 'mr': reply = 'तक्रार नोंदविण्यासाठी कृपया या लिंकवर जा: https://example.com/grievance'; break;
                default: reply = 'To file a grievance, please visit: https://example.com/grievance';
            }
            await msg.reply(reply);
            // Ask again for options
            let followup;
            switch (state.lang) {
                case 'hi': followup = 'क्या आप FAQ देखना चाहते हैं या एक और शिकायत दर्ज करना चाहते हैं?\n1. सामान्य प्रश्न (FAQ)\n2. शिकायत दर्ज करें\nउत्तर में 1 या 2 लिखें।'; break;
                case 'mr': followup = 'आपण FAQ पाहू इच्छिता किंवा आणखी एक तक्रार नोंदवू इच्छिता?\n1. वारंवार विचारले जाणारे प्रश्न (FAQ)\n2. तक्रार नोंदवा\nउत्तरात 1 किंवा 2 लिहा.'; break;
                default: followup = 'Would you like to see FAQs or file another grievance?\n1. Frequently Asked Questions (FAQ)\n2. File a Grievance\nReply with 1 or 2.';
            }
            state.step = 'post_grievance_option';
            await msg.reply(followup);
            return;
        } else {
            await msg.reply(getOptionPrompt(state.lang));
            return;
        }
    }

    if (state.step === 'faq') {
        console.log(`[FAQ] Processing question: "${msg.body}" from user: ${user}`);
        // Transliterate question for processing
        const question = transliterate(msg.body);
        // Use Excel FAQ and Gemini for best answer, always reload latest FAQ data
        let answer = '';
        try {
            // Step 1: Translate to English if needed
            let translatedQuestion = question;
            if (state.lang === 'hi' || state.lang === 'mr') {
                const translatePrompt = `Translate the following question to English:\n${question}`;
                const translatePayload = {
                    contents: [
                        {
                            parts: [
                                { text: translatePrompt }
                            ]
                        }
                    ]
                };
                console.log('[Translation] Making API call...');
                try {
                    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
                    const result = await model.generateContent(translatePrompt);
                    const response = await result.response;
                    const translated = response.text();
                    
                    if (translated) {
                        translatedQuestion = translated.trim();
                        console.log('[Translation] Success:', translatedQuestion);
                    }
                } catch (error) {
                    console.error('[Translation] Error:', error.message);
                }
            }

            // Step 2: FAQ matching in English (fuzzy + keyword)
            const faqs = loadFAQs();
            const questions = faqs.map(f => f.Question);
            const matches = stringSimilarity.findBestMatch(translatedQuestion, questions);
            const bestIndex = matches.bestMatchIndex;
            const bestScore = matches.bestMatch.rating;
            let faq = null;
            // Lower threshold for fuzzy match
            if (bestScore > 0.5) {
                faq = faqs[bestIndex];
            } else {
                // Keyword-based matching for short/partial queries with fuzzy keyword matching
                const keywords = [
                    { words: ['secretary', 'animal'], answer: null },
                    // Add more keyword sets as needed
                ];
                const userWords = translatedQuestion.toLowerCase().split(/\W+/);
                for (const row of faqs) {
                    for (const keyset of keywords) {
                        // Accept fuzzy match for each keyword (distance >= 0.7)
                        const allMatch = keyset.words.every(kw =>
                            userWords.some(uw => stringSimilarity.compareTwoStrings(kw, uw) >= 0.7)
                        );
                        if (allMatch) {
                            faq = row;
                            break;
                        }
                    }
                    if (faq) break;
                }
            }
            let context = '';
            if (faq) {
                context = `Relevant FAQ:\nQ: ${faq.Question}\nA: ${faq.Answer}\n`;
            } else {
                // If no FAQ match, give Gemini the entire FAQ sheet as context
                const faqs = loadFAQs();
                const faqContext = faqs.map(f => `Q: ${f.Question}\nA: ${f.Answer}`).join('\n---\n');
                context = `FAQ Sheet Context:\n${faqContext}\nUser Question: ${translatedQuestion}`;
            }
            let langInstruction = '';
            if (state.lang === 'hi') langInstruction = 'Reply in Hindi.';
            else if (state.lang === 'mr') langInstruction = 'Reply in Marathi.';
            const personaInstruction = `Answer as a helpful assistant for the Department of Animal Husbandry, Maharashtra. Use the information from https://dahd.maharashtra.gov.in/en/ and the FAQ context to answer user questions as accurately as possible. Speak in the first person as "I" or "we" and address the user directly. For diseases, include symptoms, causes, treatments, and preventive measures. For other concepts, provide a detailed and comprehensive explanation.`;
            
            // Check if Gemini is available, otherwise use fallback
            if (!GEMINI_AVAILABLE) {
                answer = getFallbackAnswer(translatedQuestion, faqs, state.lang);
            } else {
                try {
                    // Always use Gemini to rephrase/format the answer, even if FAQ is matched
                    const prompt = `${personaInstruction} ${langInstruction}\n${context}Original Question: ${question}\nQuestion (English): ${translatedQuestion}`;
                    
                    console.log('[Gemini] Making API call...');
                    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    answer = response.text();
                    
                    console.log('[Gemini] Success! Got answer:', answer.substring(0, 100) + '...');
                } catch (e) {
                    console.error('[Gemini] Error:', e.message);
                    console.error('[Gemini] Stack:', e.stack);
                    answer = `Sorry, I could not get an answer from Gemini. Error: ${e.message}`;
                }
            }
        } catch (e) {
            console.error('[FAQ Processing] Error:', e.message);
            answer = getFallbackAnswer(question, loadFAQs(), state.lang);
        }
        
        await msg.reply(answer);
    // Log question and answer to data.xlsx
    logQAtoExcel(question, answer);
        // After answering, ask if user wants to end chat or continue
        let followup;
        switch (state.lang) {
            case 'hi': followup = 'क्या आप चैट समाप्त करना चाहते हैं? हाँ या नहीं लिखें।'; break;
            case 'mr': followup = 'आपण चॅट समाप्त करू इच्छिता? होय किंवा नाही लिहा.'; break;
            default: followup = 'Do you want to end the chat? Type yes or no.';
        }
        state.step = 'faq_followup';
        state.yesNoPromptTime = Date.now();
        await msg.reply(followup);
        return;
    }

    if (state.step === 'faq_followup') {
        const input = msg.body.trim().toLowerCase();
        // Accept many forms of yes/no, including Hindi/Marathi synonyms and similar words
        let yesList, noList;
        if (state.lang === 'hi') {
            yesList = ['हाँ', 'ha', 'haan', 'han', 'ji', 'theek', 'ok', 'yes', 'y', 'yeah', 'sure'];
            noList = ['नहीं', 'nahi', 'na', 'no', 'n', 'nah'];
        } else if (state.lang === 'mr') {
            yesList = ['होय', 'ho', 'hoy', 'theek', 'ok', 'yes', 'y', 'yeah', 'sure'];
            noList = ['नाही', 'nahi', 'nako', 'no', 'n', 'nah'];
        } else {
            yesList = ['yes', 'y', 'yeah', 'sure', 'ok'];
            noList = ['no', 'n', 'nah'];
        }

        const isYes = yesList.some(word => input.includes(word.toLowerCase()) || stringSimilarity.compareTwoStrings(input, word) >= 0.7);
        const isNo = noList.some(word => input.includes(word.toLowerCase()) || stringSimilarity.compareTwoStrings(input, word) >= 0.7);
        
        console.log(`[FAQ Followup] User input: "${input}", isYes: ${isYes}, isNo: ${isNo}`);

        if (isYes) {
            let bye;
            switch (state.lang) {
                case 'hi': bye = 'चैट समाप्त किया गया। धन्यवाद!'; break;
                case 'mr': bye = 'चॅट समाप्त केला. धन्यवाद!'; break;
                default: bye = 'Chat ended. Thank you!';
            }
            delete userState[user];
            await msg.reply(bye);
            return; // Do not send any further messages
        } else if (isNo) {
            state.step = 'faq';
            delete state.yesNoPromptTime; // Clear the timeout
            let reply;
            switch (state.lang) {
                case 'hi': reply = 'ठीक है! कृपया अपना अगला प्रश्न पूछें। मैं आपकी मदद करने के लिए यहाँ हूँ।'; break;
                case 'mr': reply = 'ठीक आहे! कृपया आपला पुढील प्रश्न विचारा. मी आपल्या मदतीसाठी येथे आहे.'; break;
                default: reply = 'Great! Please ask your next question. I\'m here to help you with information about animal husbandry.';
            }
            await msg.reply(reply);
            return;
        } else {
            let again;
            switch (state.lang) {
                case 'hi': again = 'कृपया "हाँ" या "नहीं" लिखें।'; break;
                case 'mr': again = 'कृपया "होय" किंवा "नाही" लिहा.'; break;
                default: again = 'Please type yes or no.';
            }
            await msg.reply(again);
            return;
        }
    }


    // Fallback
        await msg.reply('Type !ping for a test or restart the conversation.');
    });

    // Add process error handlers
    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled Rejection:', reason.message || reason);
        // Don't exit on unhandled rejections, just log them
    });

    process.on('uncaughtException', (error) => {
        console.error('❌ Uncaught Exception:', error.message || error);
        process.exit(1);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down bot gracefully...');
        client.destroy().then(() => {
            console.log('✅ Bot shutdown complete');
            process.exit(0);
        }).catch((err) => {
            console.error('❌ Error during shutdown:', err.message);
            process.exit(1);
        });
    });

    // Global variable to track Gemini availability
    let GEMINI_AVAILABLE = false;

    // Initialize bot function
    async function initializeBot() {
        // Test Gemini API first
        GEMINI_AVAILABLE = await testGeminiAPI();
        if (!GEMINI_AVAILABLE) {
            console.log('⚠️ Warning: Gemini API is not working properly. Bot will use fallback FAQ system.');
        }
        
        // Start the WhatsApp client with better error handling
        console.log('🚀 Starting WhatsApp bot...');
        
        try {
            await client.initialize();
        } catch (error) {
            console.error('❌ Failed to initialize WhatsApp client:', error.message);
            console.log('🔄 Retrying in 5 seconds...');
            setTimeout(() => {
                console.log('🚀 Restarting bot...');
                process.exit(1);
            }, 5000);
        }
    }
    
    // Start the bot
    initializeBot();
