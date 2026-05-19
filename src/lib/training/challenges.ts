import trainingSampleVideo from "@/assets/training-sample.mp4";
import type { ChallengeContent } from "@/components/training/ChallengeDialog";

export const builtInChallenges: ChallengeContent[] = [
  {
    id: "c-text",
    type: "text",
    title: "Text Challenge",
    subtitle: "Urgent payment request",
    prompt:
      "Subject: UPDATED BANK DETAILS (URGENT)\n\nHi, please send the outstanding payment today to our new account. This is confidential and needs to be done immediately to avoid penalties. Reply when complete.",
    question: "What is the safest next action?",
    options: [
      {
        id: "a",
        label: "Pay now to avoid penalties",
        correct: false,
        explanation: "Urgency is a manipulation signal. Paying without verification is high risk.",
      },
      {
        id: "b",
        label: "Verify via a known number / channel, then follow policy",
        correct: true,
        explanation: "Correct: confirm the request out-of-band and use your standard approval process.",
      },
    ],
  },
  {
    id: "c-image",
    type: "image",
    title: "Image Challenge",
    subtitle: "Look for visual tells",
    prompt: "This image is being used as \"proof\". Your job: inspect artifacts (hands, edges, lighting, text/logos) before trusting it.",
    question: "Which area is most likely to reveal manipulation quickly?",
    media: { kind: "image", src: "/og.png", alt: "Training sample image used for forensic practice" },
    options: [
      {
        id: "a",
        label: "Hands / edges / small text",
        correct: true,
        explanation: "Correct: hands, hair edges, and small text often break first in synthetic images.",
      },
      {
        id: "b",
        label: "Only the center of the face",
        correct: false,
        explanation: "Faces can look convincing; edges and small details are often more diagnostic.",
      },
    ],
  },
  {
    id: "c-audio",
    type: "audio",
    title: "Audio Challenge",
    subtitle: "Voice note requesting transfer",
    prompt: "Play the voice note. Then decide what to do next.",
    question: "What should you do before acting on this request?",
    media: {
      kind: "audio",
      kindLabel: "Simulated voice note (built-in browser voice)",
      speakText: "Hi, I need you to send the payment right now. Don't message anyone else—just do it and confirm when it's done.",
    },
    options: [
      {
        id: "a",
        label: "Verify using an out-of-band method",
        correct: true,
        explanation: "Correct: treat it like wire fraud—verify through a known safe channel.",
      },
      {
        id: "b",
        label: "Comply because the voice sounds familiar",
        correct: false,
        explanation: "Cloned voices can sound familiar. The correct defense is verification, not intuition.",
      },
    ],
  },
  {
    id: "c-video",
    type: "video",
    title: "Video Challenge",
    subtitle: "Statement clip analysis",
    prompt: "Watch the clip and look for mouth-sync issues, edge shimmer, and flicker across frames.",
    question: "What is the best first pass check for a suspected deepfake video?",
    media: { kind: "video", src: trainingSampleVideo },
    options: [
      {
        id: "a",
        label: "Check lip-sync + frame-to-frame consistency",
        correct: true,
        explanation: "Correct: mouth sync and temporal consistency are fast, high-signal checks.",
      },
      {
        id: "b",
        label: "Only check if the headline seems believable",
        correct: false,
        explanation: "Believability is not evidence. Always verify media and source.",
      },
    ],
  },
];
