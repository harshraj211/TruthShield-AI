import type { LessonContent } from "@/components/training/LessonDialog";

export const builtInLessons: LessonContent[] = [
  {
    id: "l1",
    title: "Introduction to Deepfakes",
    minutes: 12,
    difficulty: "Beginner",
    steps: [
      {
        heading: "Task 1: What are deepfakes?",
        body: "A deepfake is media (image, video, audio, or text) that has been synthetically generated or manipulated using AI to appear authentic.",
        details:
          "The word ‘deepfake’ combines deep learning + fake. Unlike basic edits (cropping, color correction, simple retouching), deepfakes use trained models to learn patterns of a person’s face, voice, or writing style.\n\nCommon model families include Generative Adversarial Networks (GANs) and diffusion models. They can generate new frames, new audio, or new text that mimics real-world signals. The goal is often to create content that looks believable enough to bypass quick human judgment.",
        keyTerms: [
          {
            term: "Synthetic media",
            meaning: "Any content generated (fully or partially) by AI models rather than captured directly from the real world.",
          },
          {
            term: "GAN",
            meaning:
              "A model setup where a generator creates fakes and a discriminator tries to detect them—competition improves realism.",
          },
          {
            term: "Diffusion model",
            meaning:
              "A model that creates images/video by starting from noise and refining step-by-step into a coherent result.",
          },
          {
            term: "Face swap",
            meaning: "A technique where one person’s face is placed onto another person’s body/footage.",
          },
          {
            term: "Voice cloning",
            meaning: "Generating new speech that sounds like a target speaker.",
          },
        ],
        example: "Example: A video showing a public figure saying something they never said is a classic deepfake use case.",
        keyTakeaways: [
          "Deepfakes can be fully synthetic or partially manipulated",
          "Deep learning models learn a target’s patterns (face/voice/style)",
          "Believability is not proof of authenticity",
        ],
        questions: [
          {
            id: "l1q1",
            question: "Which best describes a deepfake?",
            options: [
              {
                id: "a",
                label: "Edited media using basic tools only",
                correct: false,
                explanation: "Basic edits alone don’t define a deepfake; deepfakes involve AI synthesis/manipulation that mimics authenticity.",
              },
              {
                id: "b",
                label: "AI-generated or AI-manipulated media made to appear authentic",
                correct: true,
                explanation: "Correct: deepfakes use AI models to generate or manipulate content so it appears real.",
              },
              {
                id: "c",
                label: "Any low-quality video footage",
                correct: false,
                explanation: "Low quality is not the definition; deepfakes can be high quality and convincing.",
              },
              {
                id: "d",
                label: "Animated cartoons",
                correct: false,
                explanation: "Animation is typically explicit and stylistic; deepfakes try to pass as real captured media.",
              },
            ],
          },
        ],
      },
      {
        heading: "Task 2: Why deepfakes matter",
        body: "Deepfakes amplify impersonation and misinformation by lowering the cost of creating persuasive, ‘real-seeming’ evidence.",
        details:
          "Deepfakes are powerful because they exploit two human shortcuts: (1) we trust realistic audio/video more than text, and (2) we act faster under urgency or authority.\n\nIn business settings, deepfakes are often paired with social engineering to trigger actions like transfers, credential sharing, or sensitive disclosures. In public settings, deepfakes can erode trust by making it harder to know what evidence is reliable.",
        keyTakeaways: ["Threat = realism + pressure", "Deepfakes scale impersonation", "Verification must be procedural, not intuitive"],
        questions: [
          {
            id: "l1q2",
            question: "In real incidents, deepfakes are most dangerous when combined with…",
            options: [
              {
                id: "a",
                label: "Social engineering (urgency, authority, secrecy)",
                correct: true,
                explanation: "Correct: attackers often pair realistic media with pressure tactics to prevent verification.",
              },
              {
                id: "b",
                label: "High-resolution cameras",
                correct: false,
                explanation: "Camera quality isn’t the core issue; manipulation + pressure is.",
              },
              {
                id: "c",
                label: "Longer emails",
                correct: false,
                explanation: "Length doesn’t correlate with risk. The combination of realism + urgency does.",
              },
              {
                id: "d",
                label: "Strong passwords",
                correct: false,
                explanation: "Passwords help, but the key pattern here is deception + pressure to act.",
              },
            ],
          },
        ],
      },
      {
        heading: "Task 3: A practical verification checklist",
        body: "Use a repeatable checklist: confirm source, confirm context, and confirm the request via an alternate channel.",
        details:
          "A good defense doesn’t rely on ‘spotting’ every fake. Instead, treat suspicious media as an untrusted signal until verified.\n\nTry this flow:\n1) Source: Who posted/sent this? Is the account verified/expected?\n2) Context: Does time/location/event metadata make sense? Any contradictions?\n3) Out-of-band: Verify using a known-safe channel (call back a known number, internal directory, or policy workflow).",
        keyTakeaways: ["Source, context, and out-of-band verification", "Process beats gut-feel", "Slow down under urgency"],
        questions: [
          {
            id: "l1q3",
            question: "What’s the safest first response to a high-urgency request in a suspicious video/audio?",
            options: [
              {
                id: "a",
                label: "Comply quickly to reduce risk",
                correct: false,
                explanation: "Urgency is often the attacker’s tool. Acting quickly increases risk.",
              },
              {
                id: "b",
                label: "Verify via a known-safe channel and follow policy",
                correct: true,
                explanation: "Correct: treat it like fraud—verify out-of-band using a trusted method.",
              },
              {
                id: "c",
                label: "Share it publicly to get opinions",
                correct: false,
                explanation: "That can spread misinformation and still doesn’t confirm authenticity.",
              },
              {
                id: "d",
                label: "Assume it’s real if it looks realistic",
                correct: false,
                explanation: "Realism isn’t proof. Verification is required.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "l2",
    title: "Face & Image Forensics",
    minutes: 14,
    difficulty: "Beginner",
    steps: [
      {
        heading: "Task 1: Lighting & shadows",
        body: "Synthetic or heavily manipulated images often have lighting that doesn’t match the scene.",
        details:
          "Start by asking: where is the light coming from? Then verify if shadows and highlights agree. Inconsistencies often appear in:\n- Shadow direction (multiple light sources that don’t make sense)\n- Specular highlights (skin/eyes/jewelry reflecting light incorrectly)\n- Color temperature (face looks ‘warmer’ than the environment)",
        keyTakeaways: ["Check shadow direction", "Check highlight shape/intensity", "Compare face vs background lighting"],
        questions: [
          {
            id: "l2q1",
            question: "Which signal is most relevant for spotting image manipulation quickly?",
            options: [
              {
                id: "a",
                label: "Shadow direction and highlight consistency",
                correct: true,
                explanation: "Correct: lighting mismatches are common artifacts in synthetic/manipulated imagery.",
              },
              {
                id: "b",
                label: "Whether the person is smiling",
                correct: false,
                explanation: "Expressions aren’t reliable evidence of manipulation.",
              },
              {
                id: "c",
                label: "Whether the image is popular online",
                correct: false,
                explanation: "Popularity is not authenticity.",
              },
              {
                id: "d",
                label: "If the caption sounds confident",
                correct: false,
                explanation: "Tone is not evidence; visual consistency is more diagnostic.",
              },
            ],
          },
        ],
      },
      {
        heading: "Task 2: Hands, teeth, and edges",
        body: "Small details often break first: hands, teeth, hair edges, glasses, jewelry, and text.",
        details:
          "Zoom in and scan for edge shimmer, warped boundaries, and anatomy errors. Even when faces look convincing, generators and editors can struggle with fine structures and repeating patterns.\n\nLook for:\n- Fingers merging or oddly bent\n- Teeth that smear or ‘melt’\n- Hairlines that blend into backgrounds\n- Glasses frames that warp",
        keyTakeaways: ["Hands are hard", "Teeth/tongue artifacts", "Edges shimmer/warp"],
        questions: [
          {
            id: "l2q2",
            question: "If you only have 10 seconds, where should you look first?",
            options: [
              {
                id: "a",
                label: "Hands, hair edges, and small text",
                correct: true,
                explanation: "Correct: those areas often reveal artifacts fastest.",
              },
              {
                id: "b",
                label: "Only the center of the face",
                correct: false,
                explanation: "Faces can be convincing; edges and details tend to reveal issues sooner.",
              },
              {
                id: "c",
                label: "The background blur only",
                correct: false,
                explanation: "Blur can be natural; it’s not the best first pass.",
              },
              {
                id: "d",
                label: "The image file name",
                correct: false,
                explanation: "File names are easily changed and don’t prove authenticity.",
              },
            ],
          },
        ],
      },
      {
        heading: "Task 3: Text & logos",
        body: "Text rendering is a common failure point for generation and editing.",
        details:
          "Check signage, labels, brand marks, and small typography. Watch for inconsistent fonts, spacing, misspellings, and warped baseline alignment.\n\nEven when text looks ‘almost’ right, small errors can indicate synthetic generation or aggressive post-processing.",
        keyTakeaways: ["Zoom in on labels", "Look for inconsistent fonts", "Check spelling and baseline alignment"],
        questions: [
          {
            id: "l2q3",
            question: "Which is the best interpretation when an image looks real but shows strong retouching/enhancement?",
            options: [
              {
                id: "a",
                label: "It’s definitely authentic",
                correct: false,
                explanation: "Edits reduce certainty. It could be real + modified, and the edit source may be unclear.",
              },
              {
                id: "b",
                label: "It’s ambiguous: real capture may be modified, origin of edits may be unclear",
                correct: true,
                explanation: "Correct: avoid high-confidence claims when there are modifications you can’t attribute to AI vs human reliably.",
              },
              {
                id: "c",
                label: "It must be AI-generated",
                correct: false,
                explanation: "Not all retouching is AI. Many edits are human or traditional tools.",
              },
              {
                id: "d",
                label: "Ignore edits since the base photo was real",
                correct: false,
                explanation: "Edits affect authenticity assessment; you should reflect uncertainty.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "l3",
    title: "Audio Deepfakes",
    minutes: 15,
    difficulty: "Intermediate",
    steps: [
      {
        heading: "Task 1: Speech realism is not proof",
        body: "Cloned voices can sound clean and consistent—sometimes more ‘perfect’ than real speech.",
        details:
          "Listen for timing that feels too uniform: perfectly paced phrases, missing micro-pauses, and unnatural emphasis. Some clones also struggle with emotional transitions (sudden anger, laughter, whispering).\n\nHowever: the biggest point is that realism is not evidence. Treat it like a suspicious payment request—verify procedurally.",
        keyTakeaways: ["Cadence can be too perfect", "Emotional transitions can glitch", "Realism ≠ authenticity"],
        questions: [
          {
            id: "l3q1",
            question: "A voice note sounds familiar and urgent. What should you do first?",
            options: [
              {
                id: "a",
                label: "Act immediately because it sounds real",
                correct: false,
                explanation: "Voice realism is not proof. Urgency is a manipulation signal.",
              },
              {
                id: "b",
                label: "Verify out-of-band using a known-safe contact",
                correct: true,
                explanation: "Correct: verify via trusted channels before acting.",
              },
              {
                id: "c",
                label: "Forward it to everyone for a vote",
                correct: false,
                explanation: "That can spread the scam. Verify via proper channels.",
              },
              {
                id: "d",
                label: "Ignore it entirely",
                correct: false,
                explanation: "You should verify; ignoring could miss real issues, but acting is also risky.",
              },
            ],
          },
        ],
      },
      {
        heading: "Task 2: Room tone and transitions",
        body: "Real recordings usually contain stable background noise. Synthetic speech can be unnaturally clean or ‘patchy’.",
        details:
          "Room tone is the constant background sound in a recording (HVAC hum, distant traffic, mic hiss). In many fake voice clips, the background changes unnaturally between words or disappears entirely.\n\nAlso listen for:\n- Abrupt cut points\n- Metallic artifacts\n- Words that ‘jump’ in volume",
        keyTakeaways: ["Room tone is a tell", "Watch transitions", "Listen for cut points and artifact bursts"],
        questions: [
          {
            id: "l3q2",
            question: "Which audio clue is often suspicious in generated voice clips?",
            options: [
              {
                id: "a",
                label: "Background noise that stays consistent",
                correct: false,
                explanation: "Consistent room tone is common in real recordings.",
              },
              {
                id: "b",
                label: "Background that vanishes between words or changes abruptly",
                correct: true,
                explanation: "Correct: unnatural room tone behavior can indicate synthesis or splicing.",
              },
              {
                id: "c",
                label: "The speaker breathes",
                correct: false,
                explanation: "Breathing is normal in real speech and can be present in fakes too.",
              },
              {
                id: "d",
                label: "The clip is short",
                correct: false,
                explanation: "Length isn’t a reliable indicator.",
              },
            ],
          },
        ],
      },
      {
        heading: "Task 3: Treat audio requests like fraud",
        body: "If the audio asks you to transfer money, share secrets, or bypass policy: verify and escalate.",
        details:
          "Use a strict workflow for high-risk requests:\n- Call back using a number from your internal directory (not the message)\n- Require a second approver for sensitive actions\n- Use challenge questions or code words where appropriate\n\nThis reduces the chance that a convincing clip triggers an irreversible action.",
        keyTakeaways: ["Call back using a known number", "Use internal approval flows", "Challenge questions can help"],
        questions: [
          {
            id: "l3q3",
            question: "What’s the strongest defense against voice cloning in business workflows?",
            options: [
              {
                id: "a",
                label: "Learning to recognize every fake",
                correct: false,
                explanation: "Detection helps, but you can’t rely on perfect human perception.",
              },
              {
                id: "b",
                label: "Mandatory out-of-band verification + approvals",
                correct: true,
                explanation: "Correct: procedural verification reduces risk even when fakes are convincing.",
              },
              {
                id: "c",
                label: "Only accepting calls during business hours",
                correct: false,
                explanation: "Attackers can strike anytime; policy and verification are more effective.",
              },
              {
                id: "d",
                label: "Ignoring any voice messages",
                correct: false,
                explanation: "You need a safe process, not blanket avoidance.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "l4",
    title: "Video Consistency",
    minutes: 16,
    difficulty: "Intermediate",
    steps: [
      {
        heading: "Task 1: Mouth sync and phonemes",
        body: "Compare lip shapes and jaw motion to speech; deepfakes often slip on fast phonemes.",
        details:
          "A practical method: focus on consonants (P/B/M/F/V) and fast transitions. Watch teeth and tongue behavior during those sounds.\n\nIf the audio says a clear ‘P’ but lips don’t close, or teeth appear/disappear inconsistently, that’s a strong signal.",
        keyTakeaways: ["Phoneme mismatch", "Teeth/tongue artifacts", "Check consonants and fast transitions"],
        questions: [
          {
            id: "l4q1",
            question: "What’s a high-signal first check for suspected deepfake video?",
            options: [
              {
                id: "a",
                label: "Lip-sync alignment and phoneme transitions",
                correct: true,
                explanation: "Correct: mouth-sync issues are common and easy to spot with practice.",
              },
              {
                id: "b",
                label: "Whether the background music is catchy",
                correct: false,
                explanation: "Music has nothing to do with authenticity.",
              },
              {
                id: "c",
                label: "If the clip is trending",
                correct: false,
                explanation: "Popularity is not evidence.",
              },
              {
                id: "d",
                label: "If the speaker uses formal words",
                correct: false,
                explanation: "Speech style isn’t reliable proof.",
              },
            ],
          },
        ],
      },
      {
        heading: "Task 2: Temporal artifacts (frame-to-frame)",
        body: "Look for flicker, edge shimmer, and changing skin texture over time.",
        details:
          "Many fakes look fine in a single frame but break when you watch motion. Common artifacts include:\n- Flicker around face edges\n- Skin texture that changes every frame\n- Glasses/hair that ‘crawl’\n\nPause and scrub frame-by-frame when possible.",
        keyTakeaways: ["Flicker", "Edge shimmer", "Texture drift"],
        questions: [
          {
            id: "l4q2",
            question: "Why is frame-to-frame inspection useful?",
            options: [
              {
                id: "a",
                label: "Because many artifacts only appear over time",
                correct: true,
                explanation: "Correct: temporal inconsistencies often reveal manipulation.",
              },
              {
                id: "b",
                label: "Because still frames are always unreliable",
                correct: false,
                explanation: "Still frames can be useful; time-based artifacts are an additional check.",
              },
              {
                id: "c",
                label: "Because captions become more accurate",
                correct: false,
                explanation: "Captions aren’t evidence of authenticity.",
              },
              {
                id: "d",
                label: "Because it increases video resolution",
                correct: false,
                explanation: "Scrubbing doesn’t change resolution; it reveals temporal behavior.",
              },
            ],
          },
        ],
      },
      {
        heading: "Task 3: Compression and compositing",
        body: "Compare face compression to the rest of the frame; compositing can create mismatched artifact patterns.",
        details:
          "If a face is inserted or heavily edited, you may see different blockiness, blur, or sharpening around the face/neck than in the background.\n\nAlso compare motion blur: does the head blur differently than the body during movement?",
        keyTakeaways: ["Face compression differs", "Neck/ear edges", "Compare motion blur patterns"],
        questions: [
          {
            id: "l4q3",
            question: "A common compositing clue is…",
            options: [
              {
                id: "a",
                label: "Different sharpening/blur on the face than the background",
                correct: true,
                explanation: "Correct: mismatched compression/sharpening can indicate insertion or heavy manipulation.",
              },
              {
                id: "b",
                label: "A person wearing glasses",
                correct: false,
                explanation: "Glasses are normal; only warping/artifacts would be suspicious.",
              },
              {
                id: "c",
                label: "High quality lighting",
                correct: false,
                explanation: "Good lighting isn’t an authenticity signal.",
              },
              {
                id: "d",
                label: "A stable frame rate",
                correct: false,
                explanation: "Stable FPS doesn’t prove authenticity.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "l5",
    title: "Text Manipulation",
    minutes: 13,
    difficulty: "Intermediate",
    steps: [
      {
        heading: "Task 1: Pressure language",
        body: "Manipulative messages often use urgency, secrecy, and authority to prevent verification.",
        details:
          "AI-written scams may also look unusually polished, confident, and ‘professional.’ Don’t reward style with trust.\n\nRed flags include:\n- “Urgent” deadlines\n- “Don’t tell anyone” secrecy\n- Authority claims (“CEO”, “legal”, “bank”)\n- Requests to bypass policy",
        keyTakeaways: ["Urgency + secrecy", "Authority pressure", "Style is not evidence"],
        questions: [
          {
            id: "l5q1",
            question: "Which phrase is the strongest red flag?",
            options: [
              {
                id: "a",
                label: "“This is confidential—don’t verify with anyone.”",
                correct: true,
                explanation: "Correct: secrecy + blocking verification is a major manipulation signal.",
              },
              {
                id: "b",
                label: "“Can you confirm receipt?”",
                correct: false,
                explanation: "That’s normal and not inherently suspicious.",
              },
              {
                id: "c",
                label: "“Thanks for your help.”",
                correct: false,
                explanation: "Politeness isn’t a red flag.",
              },
              {
                id: "d",
                label: "“Please see attached.”",
                correct: false,
                explanation: "Attachments can be risky, but this phrase alone isn’t the strongest red flag.",
              },
            ],
          },
        ],
      },
      {
        heading: "Task 2: Missing provenance",
        body: "When a claim lacks verifiable details (links, dates, names, context), treat it as untrusted.",
        details:
          "A reliable claim can be checked. If the message provides no sources, uses vague references, or avoids specifics, assume it’s not verified.\n\nAsk: What would I need to confirm this independently? Who else can validate it?",
        keyTakeaways: ["Evidence beats tone", "Demand specifics", "Independent verification"],
        questions: [
          {
            id: "l5q2",
            question: "What is the best ‘provenance’ question to ask?",
            options: [
              {
                id: "a",
                label: "“Who else can confirm this, and where is the original source?”",
                correct: true,
                explanation: "Correct: provenance is about traceability to an original, verifiable source.",
              },
              {
                id: "b",
                label: "“Does this message sound confident?”",
                correct: false,
                explanation: "Confidence is not evidence.",
              },
              {
                id: "c",
                label: "“Is this written in perfect grammar?”",
                correct: false,
                explanation: "Grammar can be faked; provenance is more important.",
              },
              {
                id: "d",
                label: "“Is this message long?”",
                correct: false,
                explanation: "Length doesn’t indicate authenticity.",
              },
            ],
          },
        ],
      },
      {
        heading: "Task 3: Verification habits",
        body: "Use a known contact method and ask a question only the real person would answer (when appropriate).",
        details:
          "Verification works best when it’s routine and low-friction:\n- Use a known-safe number/channel\n- Use internal approval steps\n- For high-risk cases, use challenge questions or a code word\n\nThis reduces both AI-written scams and human-written scams.",
        keyTakeaways: ["Out-of-band confirmation", "Challenge questions", "Use approval flows"],
        questions: [
          {
            id: "l5q3",
            question: "Which action is the best default when you suspect manipulation?",
            options: [
              {
                id: "a",
                label: "Verify using a known-safe method, then follow policy",
                correct: true,
                explanation: "Correct: verification + process is the safest default.",
              },
              {
                id: "b",
                label: "Reply directly to the message to verify",
                correct: false,
                explanation: "Replying in-channel can be controlled by the attacker; use a known-safe channel.",
              },
              {
                id: "c",
                label: "Assume it’s safe if it looks professional",
                correct: false,
                explanation: "Professional style is not evidence.",
              },
              {
                id: "d",
                label: "Forward it to a public forum",
                correct: false,
                explanation: "That can spread harmful content; verify privately using trusted methods.",
              },
            ],
          },
        ],
      },
    ],
  },
];
