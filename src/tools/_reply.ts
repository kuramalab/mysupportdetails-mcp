// Helper per costruire la reply MCP standard {content: [{type:'text', text}]}
// da qualsiasi valore serializzabile.
export function jsonReply(value: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

export function textReply(text: string): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text }] };
}
