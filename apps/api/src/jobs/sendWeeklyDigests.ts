import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { generateStudentSummary } from '../services/reporting/digestGenerator';

const prisma = new PrismaClient();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendDigest() {
  console.log('Starting weekly digest generation...');

  const guardians = await prisma.guardian.findMany({
    where: { approved: true },
    include: {
      user: { select: { email: true, name: true } },
      student: { select: { id: true, name: true } },
    },
  });

  for (const g of guardians) {
    if (!g.user.email) continue;

    try {
      const summary = await generateStudentSummary(g.student.id, 7);

      const html = `
        <h2>Weekly Learning Report for ${summary.studentName || 'Student'}</h2>
        <p><strong>Sessions:</strong> ${summary.totalSessions} | <strong>Time:</strong> ${summary.totalMinutes} min | <strong>XP:</strong> ${summary.xpEarned}</p>
        <p><strong>Streak:</strong> ${summary.currentStreak} days | <strong>Badges earned:</strong> ${summary.badgesEarned}</p>
        <h3>Subjects</h3>
        <ul>${summary.subjectBreakdown.map((s) => `<li>${s.subject}: ${s.sessions} sessions</li>`).join('')}</ul>
        <h3>Strengths</h3>
        <ul>${summary.strengths.map((s) => `<li>${s}</li>`).join('') || '<li>Keep practicing!</li>'}</ul>
        <h3>Areas to Improve</h3>
        <ul>${summary.focusAreas.map((s) => `<li>${s}</li>`).join('') || '<li>Doing great!</li>'}</ul>
        <p style="color: #888; font-size: 12px;">— Vidya AI Tutor</p>
      `;

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@vidya.ai',
        to: g.user.email,
        subject: `Vidya Weekly Report: ${summary.studentName || 'Your Student'}`,
        html,
      });

      console.log(`Sent digest to ${g.user.email} for student ${g.student.id}`);
    } catch (err) {
      console.error(`Failed to send digest for guardian ${g.id}:`, err);
    }
  }

  console.log('Weekly digest complete.');
}

sendDigest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
