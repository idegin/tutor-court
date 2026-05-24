export const getEmailServerUrl = () => {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  if (!serverUrl) {
    throw new Error('[email] NEXT_PUBLIC_SERVER_URL is required to generate email links.');
  }
  return serverUrl.replace(/\/$/, '');
};

export const getBaseEmailLayout = (title: string, content: string) => {
  const hostUrl = getEmailServerUrl();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
      line-height: 1.6;
      color: #374151;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .wrapper {
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header {
      background-color: #ffffff;
      padding: 32px 40px;
      text-align: center;
      border-bottom: 1px solid #f3f4f6;
    }
    .logo-container {
      display: inline-block;
      text-align: center;
    }
    .logo {
      width: 48px;
      height: auto;
      vertical-align: middle;
      border-radius: 12px;
    }
    .brand-name {
      display: inline-block;
      vertical-align: middle;
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin-left: 12px;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px;
      text-align: left;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .text {
      font-size: 16px;
      color: #4b5563;
      margin-bottom: 24px;
    }
    .btn-container {
      margin-top: 32px;
      margin-bottom: 32px;
      text-align: center;
    }
    .btn {
      display: inline-block;
      background-color: #6d28d9; /* tutor-purple */
      color: #ffffff !important;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 12px;
      transition: background-color 0.2s;
    }
    .btn:hover {
      background-color: #5b21b6;
    }
    .footer {
      text-align: center;
      padding: 32px 40px;
      background-color: #f9fafb;
      border-top: 1px solid #f3f4f6;
      color: #6b7280;
      font-size: 14px;
    }
    .footer p {
      margin: 0;
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 32px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="wrapper">
      <div class="header">
        <div class="logo-container">
          <img src="${hostUrl}/logo.png" alt="TutorCourt Logo" class="logo" />
          <span class="brand-name">TutorCourt</span>
        </div>
      </div>
      <div class="content">
        <h1 class="title">${title}</h1>
        ${content}
        <div class="divider"></div>
        <p class="text" style="font-size: 14px; color: #6b7280;">If you didn't request this email, you can safely ignore it.</p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} TutorCourt. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};