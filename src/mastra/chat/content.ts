export const content = {
  starters: [
    {
      title: 'Research with sources',
      message:
        'Research the latest developments in AI agents. Compare at least three reliable sources and give me a concise briefing with links.',
    },
    {
      title: 'Build a useful file',
      message:
        'Create a polished weekly planner as an HTML file, verify it in the sandbox, and upload it here.',
    },
    {
      title: 'Find Slack decisions',
      message:
        'Search Slack for decisions made in the last seven days and summarize them with links to the original messages.',
    },
    {
      title: 'Schedule a check-in',
      message:
        'Ask me for my timezone, then schedule a weekday 9 AM reminder to review my priorities.',
    },
  ],
  home: {
    type: 'home',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: "👋 I'm gorkie" },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: "I don't just answer questions, I actually do the work: write code, dig through Slack, build files, whatever the task needs. Message me directly, or @mention me in any channel.",
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*What I can do*\n• Search the web and Slack, with sources\n• Write and run code in a secure sandbox\n• Build and upload files\n• Browse websites and capture screenshots\n• Create and manage recurring scheduled tasks\n• Read, create, and update Slack canvases',
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*How to start*\nOpen a direct message and just ask, or @mention me in a channel. In a thread, keep replying to steer me without starting over.',
        },
      },
    ],
  },
};
