const fs = require('fs');
let code = fs.readFileSync('src/collections/Users.ts', 'utf8');

const endpointsInjection = `
  endpoints: [
    {
      path: '/resend-verification',
      method: 'post',
      handler: async (req) => {
        const body = await req.json();
        const email = body?.email;
        if (!email) {
            return Response.json({ error: 'Email is required' }, { status: 400 });
        }
        
        const { docs } = await req.payload.find({
          collection: 'users',
          where: { email: { equals: email } },
          showHiddenFields: true, 
        });
        
        const user = docs[0];
        if (user && !user._verified && user._verificationToken) {
          const verifyURL = \`\${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/auth/verified-email?token=\${user._verificationToken}\`;
          const content = \`
            <p class="text">Hi there,</p>
            <p class="text">Welcome to TutorCourt! We're excited to have you on board. Please verify your email address to get started.</p>
            <div class="btn-container">
              <a href="\${verifyURL}" class="btn">Verify My Email</a>
            </div>
          \`;
          await req.payload.sendEmail({
            to: user.email,
            subject: 'Verify Your Email',
            html: getBaseEmailLayout('Verify Your Email', content)
          });
        }
        return Response.json({ success: true });
      }
    },
    {
      path: '/me',
      method: 'get',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ user: null });
        }

        let tutorProfile = null;
        if (req.user.accountType === 'tutor') {
          const { docs } = await req.payload.find({
            collection: 'tutor-profiles',
            where: { user: { equals: req.user.id } },
            depth: 0,
          });
          tutorProfile = docs[0] || null;
        }

        return Response.json({
          user: req.user,
          tutorProfile,
          collection: req.collection?.config.slug || 'users',
        });
      }
    }
  ],
`;

code = code.replace("access: {", endpointsInjection + "  access: {");

const hookInjection = `
        if (operation === 'create' && data) {
           if (!data.avatarUrl && data.firstName && data.lastName) {
              data.avatarUrl = \`https://ui-avatars.com/api/?name=\${encodeURIComponent(data.firstName)}+\${encodeURIComponent(data.lastName)}&background=random&color=fff\`;
           }
        }
`;

code = code.replace("if (operation === 'create' && doc.accountType === 'tutor') {", hookInjection + "        if (operation === 'create' && doc.accountType === 'tutor') {");

const fieldsInjection = `
    {
      name: 'avatarUrl',
      type: 'text',
      admin: {
        position: 'sidebar',
      }
    },
`;

code = code.replace("name: 'avatar',", fieldsInjection + "    name: 'avatar',");

fs.writeFileSync('src/collections/Users.ts', code);
