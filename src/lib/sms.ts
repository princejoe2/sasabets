// Africa's Talking SMS (Uganda-focused). Set AT_USERNAME + AT_API_KEY in .env.local to enable.
// Without credentials, messages are logged to console only.
export async function sendSms(to: string, message: string): Promise<void> {
  const username = process.env.AT_USERNAME
  const apiKey   = process.env.AT_API_KEY
  const senderId = process.env.AT_SENDER_ID ?? 'Sabula256'

  if (!username || !apiKey) {
    console.log(`[SMS stub] +${to}: ${message}`)
    return
  }

  const phone = to.startsWith('+') ? to : `+${to}`
  try {
    await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ username, to: phone, message, from: senderId }).toString(),
    })
  } catch (err) {
    console.error('[SMS] send failed:', err)
  }
}
