/**
 * Setup script for dogfooding Vidya with grade-3 students.
 * Creates parent user, child user (grade 3), guardian link, and optional classroom.
 *
 * Run: cd vidya/apps/api && pnpm exec tsx scripts/setup-dogfood.ts
 *
 * Options:
 *   --child-name "Name"   Child display name (default: "Grade 3 Student")
 *   --parent-name "Name"  Parent display name (default: "Parent")
 *   --skip-classroom      Skip creating a classroom
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseArgs(): { childName: string; parentName: string; skipClassroom: boolean } {
  const args = process.argv.slice(2);
  let childName = 'Grade 3 Student';
  let parentName = 'Parent';
  let skipClassroom = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--child-name' && args[i + 1]) {
      childName = args[++i];
    } else if (args[i] === '--parent-name' && args[i + 1]) {
      parentName = args[++i];
    } else if (args[i] === '--skip-classroom') {
      skipClassroom = true;
    }
  }
  return { childName, parentName, skipClassroom };
}

function genJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function main() {
  const { childName, parentName, skipClassroom } = parseArgs();

  console.log('\n=== Vidya Dogfood Setup (Grade 3) ===\n');

  const parent = await prisma.user.upsert({
    where: { id: 'dogfood-parent-001' },
    update: { name: parentName, grade: null },
    create: {
      id: 'dogfood-parent-001',
      name: parentName,
      grade: null,
      preferredLang: 'EN',
    },
  });

  const child = await prisma.user.upsert({
    where: { id: 'dogfood-child-001' },
    update: { name: childName, grade: 3 },
    create: {
      id: 'dogfood-child-001',
      name: childName,
      grade: 3,
      preferredLang: 'EN',
    },
  });

  await prisma.guardian.upsert({
    where: {
      userId_studentUserId: { userId: parent.id, studentUserId: child.id },
    },
    update: { approved: true },
    create: {
      userId: parent.id,
      studentUserId: child.id,
      relationship: 'PARENT',
      approved: true,
    },
  });

  if (!skipClassroom) {
    let classroom = await prisma.classRoom.findFirst({
      where: { teacherId: parent.id, name: 'Dogfood Grade 3' },
    });
    if (!classroom) {
      classroom = await prisma.classRoom.create({
        data: {
          teacherId: parent.id,
          name: 'Dogfood Grade 3',
          joinCode: genJoinCode(),
        },
      });
      console.log('Classroom created. Join code:', classroom.joinCode);
    } else {
      console.log('Classroom already exists. Join code:', classroom.joinCode);
    }
    await prisma.classRoomStudent.upsert({
      where: {
        classRoomId_userId: { classRoomId: classroom.id, userId: child.id },
      },
      update: {},
      create: {
        classRoomId: classroom.id,
        userId: child.id,
      },
    });
  }

  console.log('\n--- Setup complete ---\n');
  console.log('Parent userId:', parent.id);
  console.log('Child userId:', child.id, `(${child.name}, grade ${child.grade})`);
  console.log('\nTo use the app as the child:');
  console.log('1. Open Vidya app');
  console.log('2. Go to Settings');
  console.log('3. Set "User ID" to:', child.id);
  console.log('4. The app will show kid mode with quest-based UI');
  console.log('\nOr set in browser console / localStorage:');
  console.log(`  localStorage.setItem('vidya-userId', '${child.id}');`);
  console.log('  (then refresh if your app reads from there)\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
