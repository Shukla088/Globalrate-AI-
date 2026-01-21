## Packages
react-markdown | For rendering rich text AI responses with formatting
framer-motion | For smooth message entry animations and UI transitions

## Notes
- API endpoint `POST /api/chat` returns `{ answer: string, sources: string[] }`
- API endpoint `GET /api/chat/history` returns array of past messages
- Chat interface needs to auto-scroll to bottom on new messages
- Markdown rendering is required for AI responses
