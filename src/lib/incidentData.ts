export type IncidentStatus = "confirmed" | "highly-likely" | "suspected";
export type AttackType = "audio" | "video" | "text" | "image";
export type TargetType = "individual" | "organization" | "general-public" | "political";

export type RedFlag = {
  id: string;
  label: string;
};

export type Incident = {
  id: string;
  title: string;
  status: IncidentStatus;
  year: number;
  attackType: AttackType;
  targetType: TargetType;
  impact: string;
  redFlags: RedFlag[];
  description: string;
  sources: { label: string; url: string }[];
};

export type AttackPattern = {
  id: string;
  name: string;
  description: string;
  techniques: string[];
  indicators: string[];
  mitigations: string[];
};

export const incidentDatabase: Incident[] = [
  {
    id: "ceo-voice-fraud-2024",
    title: "CEO Voice Deepfake Fraud",
    status: "confirmed",
    year: 2024,
    attackType: "audio",
    targetType: "organization",
    impact: "Financial Fraud",
    redFlags: [
      { id: "urgent-tone", label: "Urgent tone" },
      { id: "no-secondary", label: "No secondary verification" },
      { id: "unusual-request", label: "Unusual request channel" },
    ],
    description:
      "Scammers used AI-generated voice cloning to impersonate a CEO and convince an employee to transfer $25 million to fraudulent accounts. The deepfake voice was sophisticated enough to mimic speech patterns and tone.",
    sources: [
      { label: "CNN Report", url: "https://www.cnn.com/2024/02/04/asia/deepfake-cfo-scam-hong-kong-intl-hnk/index.html" },
      { label: "Forbes Investigation", url: "https://www.forbes.com/sites/thomasbrewster/2024/02/05/deepfake-voice-fraud-25-million-scam/" },
    ],
  },
  {
    id: "fake-political-ad-2024",
    title: "Fake Political Ad",
    status: "confirmed",
    year: 2024,
    attackType: "video",
    targetType: "general-public",
    impact: "Disinformation",
    redFlags: [
      { id: "unnatural-facial", label: "Unnatural facial expressions" },
      { id: "poor-lip-sync", label: "Poor lip synchronization" },
      { id: "sensational-claims", label: "Sensational claims" },
    ],
    description:
      "A deepfake video showed a political candidate making inflammatory statements they never said. The video went viral on social media before fact-checkers could debunk it, potentially influencing voter opinions.",
    sources: [
      { label: "AP Fact Check", url: "https://apnews.com/article/artificial-intelligence-elections-disinformation-chatgpt-bc283e7426402f0b4baa7df280a4c3fd" },
      { label: "NDTV", url: "https://www.ndtv.com/world-news/deepfake-political-scam-ads-surge-on-meta-advertisers-spend-49-million-says-watchdog-group-tech-transparency-project-9382430" },
    ],
  },
  {
    id: "fake-news-pentagon-2023",
    title: "AI-Generated Fake News (Pentagon)",
    status: "confirmed",
    year: 2023,
    attackType: "text",
    targetType: "general-public",
    impact: "Stock Market Manipulation",
    redFlags: [
      { id: "unusual-sentence", label: "Unusual sentence structures" },
      { id: "lack-named-sources", label: "Lack of named sources" },
      { id: "hosted-newly", label: "Hosted on a newly registered domain" },
    ],
    description:
      "AI-generated fake news article claimed an explosion at the Pentagon, causing brief stock market panic. The article used sophisticated language generation to appear credible but lacked verifiable sources.",
    sources: [
      { label: "NPR", url: "https://www.npr.org/2023/05/22/1177590231/fake-viral-images-of-an-explosion-at-the-pentagon-were-probably-created-by-ai" },
      { label: "CNN", url: "https://edition.cnn.com/2023/05/22/tech/twitter-fake-image-pentagon-explosion" },
    ],
  },
  {
    id: "celeb-endorsement-scam-2023",
    title: "Fake Celebrity Endorsement Scam",
    status: "confirmed",
    year: 2023,
    attackType: "video",
    targetType: "individual",
    impact: "Financial Fraud",
    redFlags: [
      { id: "too-good-endorsement", label: "Too-good-to-be-true endorsement" },
      { id: "rapid-roi-promises", label: "Rapid ROI promises" },
      { id: "unverified-platform", label: "Unverified platform hosting" },
    ],
    description:
      "Deepfake videos of celebrities endorsing cryptocurrency scams tricked thousands into investing in fraudulent schemes. The videos used face-swapping technology to place celebrity faces on actors' bodies.",
    sources: [
      { label: "BBC Investigation", url: "https://www.bbc.com/news/technology-66983194" },
      { label: "NBC News", url: "https://www.nbcnews.com/news/us-news/tom-hanks-warns-followers-wary-fraudulent-ads-using-likeness-ai-rcna168966" },
    ],
  },
  {
    id: "political-disinfo-campaign-2023",
    title: "Political Disinformation Campaign",
    status: "confirmed",
    year: 2023,
    attackType: "video",
    targetType: "political",
    impact: "Election Interference",
    redFlags: [
      { id: "timing-before-vote", label: "Timing (released just before vote)" },
      { id: "poor-audio-quality", label: "Poor audio quality in sections" },
      { id: "no-official-denial", label: "No official statement initially" },
    ],
    description:
      "A coordinated campaign released multiple deepfake videos of political figures to influence election outcomes. The campaign targeted swing voters with emotionally charged content designed to manipulate public opinion.",
    sources: [
      { label: "RSF", url: "https://rsf.org/en/2023-world-press-freedom-index-journalism-threatened-fake-content-industry" },
      { label: "The Hindu", url: "https://www.thehindu.com/news/national/misinformation-during-indian-elections-the-saga-from-2019-to-2024/article67989996.ece" },
    ],
  },
  {
    id: "ai-generated-fake-news-2023",
    title: "AI-Generated Fake News Manipulation",
    status: "highly-likely",
    year: 2023,
    attackType: "text",
    targetType: "general-public",
    impact: "Stock Market Manipulation",
    redFlags: [
      { id: "lack-attribution", label: "Lack of proper attribution" },
      { id: "manipulated-quotes", label: "Manipulated quotes" },
      { id: "unrealistic-claims", label: "Unrealistic or exaggerated claims" },
    ],
    description:
      "AI systems generated thousands of fake news articles mimicking legitimate news sources, causing market volatility and public confusion. The articles were distributed through bot networks.",
    sources: [
      { label: "WSJ Investigation", url: "https://www.wsj.com/articles/ai-generated-fake-news-is-flooding-social-media-11679587200" },
      { label: "The Verge Report", url: "https://www.theverge.com/2023/3/23/23653591/ai-fake-news-chatgpt-bots-social-media" },
    ],
  },
  {
    id: "ukr-zelenskyy-surrender-2022",
    title: "Ukraine President Surrender Deepfake",
    status: "confirmed",
    year: 2022,
    attackType: "video",
    targetType: "political",
    impact: "War Propaganda",
    redFlags: [
      { id: "poor-resolution", label: "Poor video resolution" },
      { id: "unnatural-head", label: "Unnatural head movements" },
      { id: "lighting-inconsistencies", label: "Lighting inconsistencies" },
    ],
    description:
      "A deepfake video of Ukraine's President Zelenskyy calling for surrender was circulated during the war. Ukrainian officials quickly debunked it, but it demonstrated the potential for deepfakes in warfare.",
    sources: [
      { label: "NPR Coverage", url: "https://www.npr.org/2022/03/16/1087062648/deepfake-video-zelenskyy-ukraine-russia" },
      { label: "BBC Fact Check", url: "https://www.bbc.com/news/technology-60780142" },
    ],
  },
  {
    id: "ceo-deepfake-wire-transfer-2022",
    title: "CEO Deepfake Wire Transfer",
    status: "confirmed",
    year: 2022,
    attackType: "audio",
    targetType: "organization",
    impact: "Financial Fraud",
    redFlags: [
      { id: "unusual-time", label: "Unusual time of request" },
      { id: "bypassed-protocol", label: "Bypassed standard protocols" },
      { id: "pressure-tactics", label: "Pressure tactics" },
    ],
    description:
      "Using voice deepfake technology, criminals impersonated a company CEO to authorize a fraudulent wire transfer of millions of dollars. The voice clone was convincing enough to bypass verification procedures.",
    sources: [
      { label: "Financial Times", url: "https://www.ft.com/content/167befa0-123f-4384-a37e-c8a5b78604b2" },
      { label: "Forbes Security", url: "https://www.forbes.com/sites/jessedamiani/2019/09/03/a-voice-deepfake-was-used-to-scam-a-ceo-out-of-243000/" },
    ],
  },
  {
    id: "tom-cruise-tiktok-2021",
    title: "Tom Cruise TikTok Deepfakes",
    status: "confirmed",
    year: 2021,
    attackType: "video",
    targetType: "individual",
    impact: "Identity Impersonation",
    redFlags: [
      { id: "too-perfect", label: "Too-perfect likeness" },
      { id: "no-verification", label: "No official account verification" },
      { id: "subtle-artifacts", label: "Subtle visual artifacts" },
    ],
    description:
      "Highly realistic deepfake videos of Tom Cruise on TikTok fooled millions of viewers. While created for entertainment, they demonstrated how convincing deepfakes have become and raised concerns about consent.",
    sources: [
      { label: "CNN", url: "https://edition.cnn.com/2021/08/06/tech/tom-cruise-deepfake-tiktok-company" },
      { label: "The Guardian", url: "https://www.theguardian.com/technology/2021/mar/05/how-started-tom-cruise-deepfake-tiktok-videos" },
    ],
  },
  {
    id: "elon-musk-crypto-scam-2021",
    title: "Elon Musk Cryptocurrency Scam",
    status: "confirmed",
    year: 2021,
    attackType: "video",
    targetType: "individual",
    impact: "Financial Fraud",
    redFlags: [
      { id: "get-rich-promise", label: "Get-rich-quick promise" },
      { id: "cryptocurrency-giveaway", label: "Cryptocurrency 'giveaway'" },
      { id: "urgent-action", label: "Urgent call to action" },
    ],
    description:
      "Deepfake videos of Elon Musk promoting fake cryptocurrency giveaways scammed users out of millions. The scams used sophisticated video manipulation combined with phishing websites.",
    sources: [
      { label: "BBC", url: "https://www.bbc.com/news/technology-56402378" },
      { label: "CNBC", url: "https://www.cnbc.com/2021/05/17/elon-musk-impersonators-stole-more-than-2-million-in-crypto-scams-.html" },
    ],
  },
];

export const attackPatterns: AttackPattern[] = [
  {
    id: "voice-impersonation",
    name: "Voice Cloning Attack",
    description: "Using AI voice synthesis to impersonate individuals for fraud or manipulation.",
    techniques: [
      "Voice sample collection from public sources",
      "Text-to-speech synthesis with voice cloning",
      "Real-time voice conversion during calls",
      "Pre-recorded message spoofing",
    ],
    indicators: [
      "Unusual background noise or audio quality",
      "Lack of natural speech patterns or hesitations",
      "Requests for urgent action without proper verification",
      "Bypassing normal communication channels",
    ],
    mitigations: [
      "Implement multi-factor authentication for sensitive requests",
      "Establish code words or verification questions",
      "Use video calls when possible",
      "Train employees on voice deepfake awareness",
    ],
  },
  {
    id: "face-swap-manipulation",
    name: "Face-Swap Deepfake",
    description: "Replacing a person's face in video or images with another person's face using neural networks.",
    techniques: [
      "Face detection and alignment",
      "GAN-based face generation",
      "Temporal consistency smoothing",
      "Lighting and color matching",
    ],
    indicators: [
      "Unnatural facial movements or expressions",
      "Inconsistent lighting on face vs. body",
      "Blurring or artifacts around face edges",
      "Mismatched skin tones",
    ],
    mitigations: [
      "Verify content through official channels",
      "Look for temporal inconsistencies frame-by-frame",
      "Use deepfake detection tools",
      "Cross-reference with multiple sources",
    ],
  },
  {
    id: "synthetic-media-generation",
    name: "Fully Synthetic Media",
    description: "Creating entirely fabricated images, videos, or audio that never existed in reality.",
    techniques: [
      "Generative adversarial networks (GANs)",
      "Diffusion models for image generation",
      "Neural text-to-speech synthesis",
      "Procedural content generation",
    ],
    indicators: [
      "Too-perfect or unrealistic details",
      "Repetitive patterns or artifacts",
      "Lack of verifiable source",
      "Inconsistent metadata",
    ],
    mitigations: [
      "Verify through reverse image/video search",
      "Check EXIF data and metadata",
      "Demand primary sources",
      "Use AI detection tools",
    ],
  },
  {
    id: "text-generation-disinformation",
    name: "AI-Generated Text Campaigns",
    description: "Using large language models to create convincing fake articles, social media posts, or reviews at scale.",
    techniques: [
      "Large language model prompting",
      "Style transfer to mimic specific authors",
      "Automated multi-platform posting",
      "Bot network amplification",
    ],
    indicators: [
      "Unusual writing patterns or generic language",
      "Lack of specific details or sources",
      "Rapid posting frequency",
      "Coordinated messaging across accounts",
    ],
    mitigations: [
      "Verify facts through multiple independent sources",
      "Check author credentials and history",
      "Look for corroborating evidence",
      "Use AI text detection tools",
    ],
  },
  {
    id: "lip-sync-deepfake",
    name: "Lip-Sync Manipulation",
    description: "Altering the mouth movements in video to match fabricated audio, making it appear someone said something they didn't.",
    techniques: [
      "Audio-driven facial animation",
      "Phoneme-to-viseme mapping",
      "Temporal smoothing",
      "Expression transfer",
    ],
    indicators: [
      "Misaligned lip movements",
      "Unnatural jaw movements",
      "Audio-visual desynchronization",
      "Inconsistent lighting on mouth area",
    ],
    mitigations: [
      "Watch for micro-expressions and natural hesitations",
      "Compare with authentic videos of the person",
      "Check audio quality and background consistency",
      "Verify through official statements",
    ],
  },
  {
    id: "audio-splice-manipulation",
    name: "Audio Splicing & Manipulation",
    description: "Cutting, rearranging, or synthesizing audio segments to change meaning or fabricate statements.",
    techniques: [
      "Audio segmentation and reassembly",
      "Voice tone normalization",
      "Background noise matching",
      "Contextual audio insertion",
    ],
    indicators: [
      "Abrupt audio transitions",
      "Inconsistent background noise",
      "Unnatural pauses or rhythm",
      "Mismatched audio quality between segments",
    ],
    mitigations: [
      "Analyze audio waveforms for discontinuities",
      "Compare with original recordings when available",
      "Use audio forensic tools",
      "Verify context and full conversation",
    ],
  },
];
