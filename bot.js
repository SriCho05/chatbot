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
// Gemini API endpoint and key (use header, not URL param)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GEMINI_API_KEY = 'AIzaSyA4yidzrTffDasI2-nmpfrVozb9WP4EmHc';
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
const puppeteerArgs = [];
if (os.platform() === 'linux' && process.getuid && process.getuid() === 0) {
    // Add --no-sandbox flag if running as root on Linux (VPS)
    puppeteerArgs.push('--no-sandbox', '--disable-setuid-sandbox');
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: puppeteerArgs
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code above with your WhatsApp to connect the bot.');
});

client.on('ready', () => {
    console.log('✅ WhatsApp bot is now connected and ready!');
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
                const translateResponse = await fetch(GEMINI_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-goog-api-key': GEMINI_API_KEY
                    },
                    body: JSON.stringify(translatePayload)
                });
                const translateData = await translateResponse.json();
                const translated = translateData.candidates && translateData.candidates[0] && translateData.candidates[0].content && translateData.candidates[0].content.parts && translateData.candidates[0].content.parts[0].text;
                if (translated) translatedQuestion = translated.trim();
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
            const personaInstruction = 'Answer as a helpful assistant for the Department of Animal Husbandry, Maharashtra. Use the information from https://dahd.maharashtra.gov.in/en/ and the FAQ context to answer user questions as accurately as possible. Speak in the first person as "I" or "we" and address the user directly.';
            // Always use Gemini to rephrase/format the answer, even if FAQ is matched
            const geminiPayload = {
                contents: [
                    {
                        parts: [
                            {
                                text: `${personaInstruction} ${langInstruction}\n${context}Original Question: ${question}\nQuestion (English): ${translatedQuestion}`
                            }
                        ]
                    }
                ]
            };
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-goog-api-key': GEMINI_API_KEY
                },
                body: JSON.stringify(geminiPayload)
            });
            const data = await response.json();
            answer = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text
                ? data.candidates[0].content.parts[0].text
                : 'Sorry, I could not get an answer from Gemini.';
        } catch (e) {
            console.error('[Gemini] Error:', e);
            answer = 'Sorry, I could not get an answer from Gemini.';
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

        const isYes = yesList.some(word => stringSimilarity.compareTwoStrings(input, word) >= 0.7);
        const isNo = noList.some(word => stringSimilarity.compareTwoStrings(input, word) >= 0.7);

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
            let reply;
            switch (state.lang) {
                case 'hi': reply = 'कृपया अपना अगला प्रश्न पूछें (FAQ)।'; break;
                case 'mr': reply = 'कृपया आपला पुढील प्रश्न विचारा (FAQ).'; break;
                default: reply = 'Please type your next FAQ question.';
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

    // Start the WhatsApp client
    client.initialize();
