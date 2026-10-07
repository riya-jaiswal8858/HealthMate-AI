// HealthMate AI - improved client-side app for hackathon

const input = document.getElementById('symptom-input');
const addBtn = document.getElementById('add-btn');
const resultsSection = document.getElementById('results');
const resultsContent = document.getElementById('results-content');
const clearBtn = document.getElementById('clear-btn');
const analyzeBtn = document.getElementById('analyze-btn');
const chips = document.querySelectorAll('.chip');
const selectedList = document.getElementById('selected-list');
const riskBadge = document.getElementById('risk-indicator');
const doctorList = document.getElementById('doctor-list');

// Expanded knowledge base with common symptoms
const KB = {
  fever: {
    overview: 'An elevated body temperature often caused by infection or inflammation.',
    common_causes: ['viral infection (e.g., cold, flu)', 'bacterial infection', 'heat exhaustion'],
    self_care: ['rest', 'stay hydrated', 'use paracetamol/acetaminophen or ibuprofen as directed', 'cool compress'],
    when_to_see_doctor: ['fever above 39°C (102°F)', 'fever lasting more than 3 days', 'difficulty breathing', 'severe headache', 'confusion', 'rash', 'in infants or immunocompromised people']
  },
  cough: {
    overview: 'A reflex to clear your throat and airways. Can be dry or productive (with phlegm).',
    common_causes: ['common cold', 'flu', 'allergies', 'bronchitis'],
    self_care: ['stay hydrated', 'honey for adults/older children', 'humidifier or warm drinks', 'lozenges'],
    when_to_see_doctor: ['cough lasting more than 3 weeks', 'cough with blood', 'difficulty breathing', 'high fever']
  },
  cold: {
    overview: 'Mild viral infection of the upper respiratory tract, usually self-limited.',
    common_causes: ['rhinovirus', 'other respiratory viruses'],
    self_care: ['rest', 'fluids', 'saline nasal spray', 'pain relievers for discomfort'],
    when_to_see_doctor: ['high fever', 'symptoms lasting more than 10 days', 'severe sinus pain or ear pain']
  },
  "stomach pain": {
    overview: 'Pain in the abdominal area; causes range from minor (gas) to serious (appendicitis).',
    common_causes: ['indigestion', 'gas', 'food poisoning', 'menstrual cramps', 'constipation'],
    self_care: ['rest', 'gentle heat (heating pad)', 'clear fluids', 'BRAT diet for upset stomach'],
    when_to_see_doctor: ['severe or localized pain', 'fever with abdominal pain', 'persistent vomiting', 'blood in stool']
  },
  "sore throat": {
    overview: 'Pain or irritation in the throat, often caused by infection or irritation.',
    common_causes: ['viral infection', 'strep throat', 'allergies', 'dry air or smoke'],
    self_care: ['saltwater gargles', 'lozenges', 'warm fluids', 'rest'],
    when_to_see_doctor: ['difficulty breathing or swallowing', 'fever and severe sore throat', 'white patches on tonsils', 'symptoms worse or not improving']
  },
  nausea: {
    overview: 'A sensation of needing to vomit. It can precede vomiting or occur alone.',
    common_causes: ['stomach virus', 'food poisoning', 'medication side effects', 'pregnancy'],
    self_care: ['sip clear fluids', 'eat bland small meals', 'try ginger or peppermint', 'rest'],
    when_to_see_doctor: ['severe or persistent vomiting', 'signs of dehydration', 'blood in vomit']
  },
  rash: {
    overview: 'Change in skin color or texture; can be itchy, painful, or asymptomatic.',
    common_causes: ['allergic reaction', 'contact dermatitis', 'viral rashes', 'heat rash'],
    self_care: ['avoid irritant', 'cool compress', 'antihistamines for itching', 'mild topical corticosteroid for contact dermatitis (short term)'],
    when_to_see_doctor: ['rash with difficulty breathing', 'rash with fever', 'rapidly spreading rash', 'signs of infection']
  },
  "shortness of breath": {
    overview: 'Difficulty breathing or feeling unable to take a full breath.',
    common_causes: ['asthma', 'allergic reaction', 'anxiety', 'respiratory infection'],
    self_care: ['sit upright', 'use prescribed inhaler if available', 'calm breathing techniques'],
    when_to_see_doctor: ['severe or sudden breathing difficulty', 'bluish lips or face', 'high fever', 'chest pain']
  },
  dizziness: {
    overview: 'A sensation of lightheadedness, unsteadiness, or spinning (vertigo).',
    common_causes: ['dehydration', 'low blood pressure', 'inner ear issues', 'medication side effects'],
    self_care: ['sit or lie down until it passes', 'drink fluids', 'avoid driving or operating machinery'],
    when_to_see_doctor: ['fainting spells', 'sudden severe dizziness', 'neurological symptoms (weakness, slurred speech)']
  },
  headache: {
    overview: 'Pain in the head; many types (tension, migraine, cluster).',
    common_causes: ['stress or tension', 'dehydration', 'lack of sleep', 'eye strain', 'migraine'],
    self_care: ['rest in a quiet, dark room', 'stay hydrated', 'over-the-counter pain relief as directed', 'cold or warm compress depending on type'],
    when_to_see_doctor: ['sudden severe headache', 'headache after an injury', 'neurological symptoms (weakness, vision changes)', 'persistent or worsening headaches']
  }
};

// Rules for risk estimation (simple, conservative)
// Urgent: any symptom explicitly life-threatening or matching shortness of breath, chest pain (if provided)
// Moderate: combinations of symptoms that suggest higher risk (fever + shortness of breath, high fever, severe vomiting)
// Low: common, mild single symptoms

function normalizeSymptom(s){
  return s.trim().toLowerCase();
}

function parseInput(text){
  if(!text) return [];
  // split by comma or 'and' and remove empties
  const parts = text.split(/,|\band\b/).map(p=>normalizeSymptom(p)).filter(Boolean);
  // deduplicate
  return [...new Set(parts)];
}

function lookupSymptoms(symptoms){
  const found = [];
  const unknown = [];
  symptoms.forEach(s=>{
    const k = Object.keys(KB).find(key=>key===s || key===s.replace(/\s+/g,' '));
    if(k) found.push({term:s, info:KB[k]});
    else unknown.push(s);
  });
  return {found, unknown};
}

function estimateRisk(symptoms){
  const s = symptoms.map(normalizeSymptom);
  // urgent rules
  if(s.includes('shortness of breath') || s.includes('chest pain')) return 'urgent';
  if(s.includes('fainting') || s.includes('loss of consciousness')) return 'urgent';
  // moderate rules
  if(s.includes('fever') && (s.includes('shortness of breath') || s.includes('cough'))) return 'moderate';
  if(s.includes('fever') && s.includes('stomach pain')) return 'moderate';
  if(s.includes('nausea') && s.includes('persistent vomiting')) return 'moderate';
  // high fever keyword
  // default: if any symptom is not in KB treat moderate
  const unknownCount = s.filter(x=>!Object.keys(KB).includes(x)).length;
  if(unknownCount>0) return 'moderate';
  // low risk default
  return 'low';
}

function riskBadgeFor(level){
  const el = document.createElement('div');
  el.className = 'risk-badge ' + level;
  if(level==='low'){
    el.textContent = 'Low';
  } else if(level==='moderate'){
    el.textContent = 'Moderate';
  } else {
    el.textContent = 'Urgent';
  }
  return el;
}

function buildResults(found, unknown, selected){
  resultsContent.innerHTML = '';
  doctorList.innerHTML = '';

  if(found.length===0 && unknown.length===0){
    resultsContent.innerHTML = '<p class="muted">Please select or type a symptom to analyze.</p>';
    return;
  }

  // build items
  found.forEach(item=>{
    const div = document.createElement('div');
    div.className = 'results-item';
    const html = `
      <h3 style="margin:0 0 6px 0;text-transform:capitalize">${escapeHtml(item.term)}</h3>
      <p style="margin:0 6px 8px 0"><strong>Overview:</strong> ${escapeHtml(item.info.overview)}</p>
      <p style="margin:0 6px 6px 0"><strong>Common causes:</strong> ${escapeHtml(item.info.common_causes.join(', '))}</p>
      <p style="margin:0 6px 6px 0"><strong>Basic self-care:</strong> ${escapeHtml(item.info.self_care.join('; '))}</p>
      <p style="margin:0 6px 0 0"><strong>When to consult a doctor:</strong> ${escapeHtml(item.info.when_to_see_doctor.join('; '))}</p>
    `;
    div.innerHTML = html;
    resultsContent.appendChild(div);

    // aggregate doctor guidance list
    item.info.when_to_see_doctor.forEach(g=>{
      const li = document.createElement('li');
      li.textContent = g;
      doctorList.appendChild(li);
    });
  });

  if(unknown.length>0){
    const div = document.createElement('div');
    div.className = 'results-item important';
    div.innerHTML = `<h3 style="margin:0 0 6px 0">Unknown symptom(s)</h3><p class="muted" style="margin:0">We don't have structured info for: ${escapeHtml(unknown.join(', '))}.</p><p style="margin-top:8px">Try simpler terms or check with a healthcare professional for personalized advice.</p>`;
    resultsContent.appendChild(div);

    const li = document.createElement('li');
    li.textContent = 'Symptoms not recognized — consider seeking medical advice if you feel unwell.';
    doctorList.appendChild(li);
  }

  // reminder about limitations
  const note = document.createElement('div');
  note.className = 'results-item';
  note.innerHTML = '<strong>Remember:</strong> This information is general. It is not medical advice and does not replace a consultation with a healthcare provider.';
  resultsContent.appendChild(note);
}

function escapeHtml(str){
  return String(str).replace(/[&<>\"']/g, function(tag) {
    const charsToReplace = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return charsToReplace[tag] || tag;
  });
}

// UI helpers for selected chips
let selected = [];
function renderSelected(){
  selectedList.innerHTML = '';
  selected.forEach(s=>{
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.innerHTML = `<span>${escapeHtml(s)}</span><button title="Remove">✕</button>`;
    pill.querySelector('button').addEventListener('click', ()=>{
      selected = selected.filter(x=>x!==s);
      renderSelected();
    });
    selectedList.appendChild(pill);
  });
}

// add symptom from input
addBtn.addEventListener('click', ()=>{
  const text = input.value.trim();
  if(!text) return;
  const parts = parseInput(text);
  parts.forEach(p=>{ if(!selected.includes(p)) selected.push(p); });
  input.value = '';
  renderSelected();
});

// chip click
chips.forEach(c=>{
  c.addEventListener('click', ()=>{
    const val = normalizeSymptom(c.textContent.trim());
    if(!selected.includes(val)) selected.push(val);
    renderSelected();
  });
});

// clear
clearBtn.addEventListener('click', ()=>{
  selected = [];
  renderSelected();
  resultsContent.innerHTML = '';
  doctorList.innerHTML = '';
  resultsSection.classList.add('hidden');
  riskBadge.textContent = '';
  riskBadge.className = 'risk-badge';
});

// analyze
analyzeBtn.addEventListener('click', ()=>{
  if(selected.length===0){
    alert('Please add or select at least one symptom.');
    return;
  }
  const {found, unknown} = lookupSymptoms(selected);
  const level = estimateRisk(selected);
  // update risk badge
  riskBadge.textContent = '';
  riskBadge.className = 'risk-badge ' + level;
  if(level==='low') riskBadge.textContent = 'Low';
  else if(level==='moderate') riskBadge.textContent = 'Moderate';
  else riskBadge.textContent = 'Urgent';

  buildResults(found, unknown, selected);
  resultsSection.classList.remove('hidden');
});

// keyboard: Enter to add, Ctrl+Enter to analyze
input.addEventListener('keydown', (e)=>{
  if(e.key==='Enter' && !e.ctrlKey){
    e.preventDefault();
    addBtn.click();
  } else if(e.key==='Enter' && e.ctrlKey){
    e.preventDefault();
    analyzeBtn.click();
  }
});

// initial UI text
resultsContent.innerHTML = '<p class="muted">Select symptoms first. Click Analyze to see guidance and risk indicator.</p>';

// Assistant elements
const assistantInput = document.getElementById('assistant-input');
const assistantSend = document.getElementById('assistant-send');
const chatWindow = document.getElementById('chat-window');
const suggestedList = document.getElementById('suggested-list');

// Suggested example questions
const SUGGESTED = [
  'How can I ease a sore throat at home?',
  'What should I do for a mild fever?',
  'When should I see a doctor for a cough?',
  'How can I prevent dehydration when vomiting?',
  'What are general tips to improve sleep while sick?'
];

function appendMessage(text, who='assistant'){
  const div = document.createElement('div');
  div.className = 'msg ' + (who==='user' ? 'user' : 'assistant');
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  div.appendChild(bubble);
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// build suggested buttons
SUGGESTED.forEach(q=>{
  const b = document.createElement('button');
  b.className = 'ask-btn';
  b.textContent = q;
  b.addEventListener('click', ()=>{
    assistantInput.value = q;
    sendAssistant();
  });
  suggestedList.appendChild(b);
});

function sendAssistant(){
  const text = assistantInput.value.trim();
  if(!text) return;
  appendMessage(text, 'user');
  assistantInput.value = '';

  // Simple local rule-based assistant responses
  const q = text.toLowerCase();
  let reply = "I'm here to help with general information.\n";

  // rules
  if(q.includes('sore throat')){
    reply += "Basic tips: rest, warm fluids, saltwater gargles, lozenges, and stay hydrated. If you have trouble breathing, swallowing, high fever, or white patches on your tonsils, see a doctor.";
  } else if(q.includes('fever')){
    reply += "For mild fever: rest, fluids, and paracetamol or ibuprofen as you normally would (follow package instructions). See a doctor for high fever (above 39°C / 102°F), fever lasting more than 3 days, severe headache, or breathing problems.";
  } else if(q.includes('cough')){
    reply += "Try staying hydrated, using a humidifier, and throat lozenges. If cough lasts more than 3 weeks, produces blood, or you have difficulty breathing or high fever, consult a healthcare provider.";
  } else if(q.includes('dehydr') || q.includes('vomit')){
    reply += "Sip clear fluids, use oral rehydration solutions if available, rest. Seek care for persistent vomiting, inability to keep fluids down, signs of dehydration, or blood in vomit.";
  } else if(q.includes('sleep')){
    reply += "Good sleep helps recovery: keep a regular schedule, limit screens before bed, create a comfortable sleep environment, and avoid heavy meals before sleeping. See a provider if sleep problems are severe or prolonged.";
  } else if(q.includes('prevent') || q.includes('preventive')){
    reply += "Preventive tips: hand hygiene, vaccinations, balanced diet, regular exercise, adequate sleep, and avoid close contact with sick people.";
  } else {
    reply += "General advice: rest, monitor symptoms, stay hydrated, and use over-the-counter remedies for symptom relief as directed. If you experience severe symptoms (difficulty breathing, chest pain, sudden weakness, severe bleeding, or loss of consciousness), seek emergency care immediately or call your local emergency number.";
  }

  // safety final note
  reply += "\n\nNote: This assistant provides general information only. It does not diagnose or prescribe. For personalized medical advice, consult a healthcare professional.";

  // simulate small delay
  setTimeout(()=>appendMessage(reply, 'assistant'), 400);
}

assistantSend.addEventListener('click', sendAssistant);
assistantInput.addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){
    e.preventDefault();
    sendAssistant();
  }
});

// render any selected by chips on load (none)
renderSelected();
