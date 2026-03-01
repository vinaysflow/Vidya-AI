/**
 * Essay Prompt Seed Data
 * 
 * Contains structured essay prompt data for:
 * - Common App personal statement prompts (2025-2026)
 * - UC Personal Insight Questions (2025-2026)
 * - Top 20 US university supplemental prompts (2025-2026)
 * 
 * Run via: pnpm --filter @vidya/api run db:seed
 */

import { PrismaClient, PromptType, PromptCategory, PromptSource, SchoolSelectivity } from '@prisma/client';

// ============================================
// TYPES
// ============================================

interface SchoolSeed {
  name: string;
  slug: string;
  location?: string;
  selectivity: SchoolSelectivity;
  applicationPlatform?: string;
  acceptanceRate?: number;
  websiteUrl?: string;
  essayPageUrl?: string;
  prompts: PromptSeed[];
}

interface PromptSeed {
  promptText: string;
  wordLimit?: number;
  charLimit?: number;
  required: boolean;
  promptType: PromptType;
  promptCategory: PromptCategory;
  sortOrder: number;
}

const ACADEMIC_YEAR = '2025-2026';

// ============================================
// COMMON APP
// ============================================

const COMMON_APP: SchoolSeed = {
  name: 'Common Application',
  slug: 'common-app',
  location: 'Arlington, VA',
  selectivity: 'MODERATE' as SchoolSelectivity,
  applicationPlatform: 'Common App',
  websiteUrl: 'https://www.commonapp.org',
  essayPageUrl: 'https://www.commonapp.org/apply/essay-prompts',
  prompts: [
    {
      promptText: 'Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, then please share your story.',
      wordLimit: 650, required: true, promptType: 'PERSONAL_STATEMENT', promptCategory: 'IDENTITY', sortOrder: 1,
    },
    {
      promptText: 'The lessons we take from obstacles we encounter can be fundamental to later success. Recount a time when you faced a challenge, setback, or failure. How did it affect you, and what did you learn from the experience?',
      wordLimit: 650, required: true, promptType: 'PERSONAL_STATEMENT', promptCategory: 'CHALLENGE', sortOrder: 2,
    },
    {
      promptText: 'Reflect on a time when you questioned or challenged a belief or idea. What prompted your thinking? What was the outcome?',
      wordLimit: 650, required: true, promptType: 'PERSONAL_STATEMENT', promptCategory: 'GROWTH', sortOrder: 3,
    },
    {
      promptText: 'Reflect on something that someone has done for you that has made you happy or thankful in a surprising way. How has this gratitude affected or motivated you?',
      wordLimit: 650, required: true, promptType: 'PERSONAL_STATEMENT', promptCategory: 'GROWTH', sortOrder: 4,
    },
    {
      promptText: 'Discuss an accomplishment, event, or realization that sparked a period of personal growth and a new understanding of yourself or others.',
      wordLimit: 650, required: true, promptType: 'PERSONAL_STATEMENT', promptCategory: 'GROWTH', sortOrder: 5,
    },
    {
      promptText: 'Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time. Why does it captivate you? What or who do you turn to when you want to learn more?',
      wordLimit: 650, required: true, promptType: 'PERSONAL_STATEMENT', promptCategory: 'INTELLECTUAL', sortOrder: 6,
    },
    {
      promptText: 'Share an essay on any topic of your choice. It can be one you\'ve already written, one that responds to a different prompt, or one of your own design.',
      wordLimit: 650, required: true, promptType: 'PERSONAL_STATEMENT', promptCategory: 'OTHER', sortOrder: 7,
    },
  ],
};

// ============================================
// UC PERSONAL INSIGHT QUESTIONS
// ============================================

const UC_SYSTEM: SchoolSeed = {
  name: 'University of California',
  slug: 'uc-system',
  location: 'Oakland, CA',
  selectivity: 'SELECTIVE' as SchoolSelectivity,
  applicationPlatform: 'UC Application',
  websiteUrl: 'https://www.universityofcalifornia.edu',
  essayPageUrl: 'https://admission.universityofcalifornia.edu/how-to-apply/applying-as-a-freshman/personal-insight-questions.html',
  prompts: [
    {
      promptText: 'Describe an example of your leadership experience in which you have positively influenced others, helped resolve disputes or contributed to group efforts over time.',
      wordLimit: 350, required: true, promptType: 'PERSONAL_STATEMENT', promptCategory: 'COMMUNITY', sortOrder: 1,
    },
    {
      promptText: 'Every person has a creative side, and it can be expressed in many ways: problem solving, original and innovative thinking, and artistically, to name a few. Describe how you express your creative side.',
      wordLimit: 350, required: true, promptType: 'PERSONAL_STATEMENT', promptCategory: 'EXTRACURRICULAR', sortOrder: 2,
    },
    {
      promptText: 'What would you say is your greatest talent or skill? How have you developed and demonstrated that talent over time?',
      wordLimit: 350, required: true, promptType: 'PERSONAL_STATEMENT', promptCategory: 'EXTRACURRICULAR', sortOrder: 3,
    },
    {
      promptText: 'Describe how you have taken advantage of a significant educational opportunity or worked to overcome an educational barrier you have faced.',
      wordLimit: 350, required: true, promptType: 'PERSONAL_STATEMENT', promptCategory: 'CHALLENGE', sortOrder: 4,
    },
    {
      promptText: 'Describe the most significant challenge you have faced and the steps you have taken to overcome this challenge. How has this challenge affected your academic achievement?',
      wordLimit: 350, required: true, promptType: 'PERSONAL_STATEMENT', promptCategory: 'CHALLENGE', sortOrder: 5,
    },
    {
      promptText: 'Think about an academic subject that inspires you. Describe how you have furthered this interest inside and/or outside of the classroom.',
      wordLimit: 350, required: true, promptType: 'PERSONAL_STATEMENT', promptCategory: 'INTELLECTUAL', sortOrder: 6,
    },
    {
      promptText: 'What have you done to make your school or your community a better place?',
      wordLimit: 350, required: true, promptType: 'PERSONAL_STATEMENT', promptCategory: 'COMMUNITY', sortOrder: 7,
    },
    {
      promptText: 'Beyond what has already been shared in your application, what do you believe makes you a strong candidate for admissions to the University of California?',
      wordLimit: 350, required: true, promptType: 'PERSONAL_STATEMENT', promptCategory: 'OTHER', sortOrder: 8,
    },
  ],
};

// ============================================
// TOP 20 SCHOOLS - SUPPLEMENTAL PROMPTS
// ============================================

const PRINCETON: SchoolSeed = {
  name: 'Princeton University',
  slug: 'princeton',
  location: 'Princeton, NJ',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.035,
  websiteUrl: 'https://www.princeton.edu',
  prompts: [
    { promptText: 'Princeton values community and encourages students, faculty, staff and leadership to engage in respectful conversations that can expand their perspectives. Please share a time when you had a conversation with a person or a group of people about a difficult topic. What insight did you gain, and how would you incorporate that knowledge going forward?', wordLimit: 250, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'DIVERSITY', sortOrder: 1 },
    { promptText: 'Princeton has a longstanding commitment to understanding our responsibility to society through service and civic engagement. How does your own story intersect with these ideals?', wordLimit: 250, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'COMMUNITY', sortOrder: 2 },
    { promptText: 'What is a new skill, experience, or knowledge you want to gain at Princeton? How do you envision this pursuit shaping your academic and personal journey?', wordLimit: 250, required: true, promptType: 'WHY_SCHOOL', promptCategory: 'WHY_US', sortOrder: 3 },
    { promptText: 'What brings you joy?', wordLimit: 250, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'IDENTITY', sortOrder: 4 },
  ],
};

const MIT: SchoolSeed = {
  name: 'Massachusetts Institute of Technology',
  slug: 'mit',
  location: 'Cambridge, MA',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'MIT Portal',
  acceptanceRate: 0.039,
  websiteUrl: 'https://www.mit.edu',
  prompts: [
    { promptText: 'We know you lead a busy life, full of activities, many of which are required of you. Tell us about something you do simply for the pleasure of it.', wordLimit: 225, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'IDENTITY', sortOrder: 1 },
    { promptText: 'How has the world you come from shaped who you dream of becoming?', wordLimit: 225, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'IDENTITY', sortOrder: 2 },
    { promptText: 'MIT brings people with diverse backgrounds together to collaborate, from tackling the world\'s biggest challenges to lending a helping hand. Describe one way you have collaborated with others to learn from them, with them, or contribute to your community together.', wordLimit: 225, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'COMMUNITY', sortOrder: 3 },
    { promptText: 'How did you manage a situation or challenge that you didn\'t expect? What did you learn from it?', wordLimit: 225, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'CHALLENGE', sortOrder: 4 },
    { promptText: 'Tell us about something you found fascinating recently and why it matters to you. It could be an idea, an event, a piece of media, or a topic in one of your classes.', wordLimit: 225, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'INTELLECTUAL', sortOrder: 5 },
  ],
};

const HARVARD: SchoolSeed = {
  name: 'Harvard University',
  slug: 'harvard',
  location: 'Cambridge, MA',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.032,
  websiteUrl: 'https://www.harvard.edu',
  prompts: [
    { promptText: 'Harvard has long recognized the importance of enrolling a diverse student body. How will the life experiences that shape who you are today enable you to contribute to Harvard?', wordLimit: 200, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'DIVERSITY', sortOrder: 1 },
    { promptText: 'Briefly describe an intellectual experience that was important to you.', wordLimit: 200, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'INTELLECTUAL', sortOrder: 2 },
    { promptText: 'Briefly describe any of your extracurricular activities, employment experience, travel, or family responsibilities that have shaped who you are.', wordLimit: 200, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'EXTRACURRICULAR', sortOrder: 3 },
    { promptText: 'How do you hope to use your Harvard education in the future?', wordLimit: 200, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'GROWTH', sortOrder: 4 },
    { promptText: 'Top 3 things your roommates might like to know about you.', wordLimit: 200, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'IDENTITY', sortOrder: 5 },
  ],
};

const STANFORD: SchoolSeed = {
  name: 'Stanford University',
  slug: 'stanford',
  location: 'Stanford, CA',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.032,
  websiteUrl: 'https://www.stanford.edu',
  prompts: [
    { promptText: 'The Stanford community is deeply curious and driven to learn in and out of the classroom. Reflect on an idea or experience that makes you genuinely excited about learning.', wordLimit: 250, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'INTELLECTUAL', sortOrder: 1 },
    { promptText: 'Virtually all of Stanford\'s undergraduates live on campus. Write a note to your future roommate that reveals something about you or that will help your roommate — and us — get to know you better.', wordLimit: 250, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'IDENTITY', sortOrder: 2 },
    { promptText: 'Tell us about something that is meaningful to you and why.', wordLimit: 250, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'IDENTITY', sortOrder: 3 },
    { promptText: 'What is the most significant challenge that society faces today?', wordLimit: 50, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'OTHER', sortOrder: 4 },
    { promptText: 'How did you spend your last two summers?', wordLimit: 50, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'EXTRACURRICULAR', sortOrder: 5 },
    { promptText: 'What historical moment or event do you wish you could have witnessed?', wordLimit: 50, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'INTELLECTUAL', sortOrder: 6 },
    { promptText: 'What five words best describe you?', wordLimit: 50, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'IDENTITY', sortOrder: 7 },
    { promptText: 'When the choice is yours, what do you read, listen to, or watch?', wordLimit: 50, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'IDENTITY', sortOrder: 8 },
  ],
};

const YALE: SchoolSeed = {
  name: 'Yale University',
  slug: 'yale',
  location: 'New Haven, CT',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.043,
  websiteUrl: 'https://www.yale.edu',
  prompts: [
    { promptText: 'Students at Yale have time to explore their academic interests before committing to one or more major fields of study. Many students either modify their original academic direction or discover fields of interest that they had not considered before arriving at Yale. What scholarly areas are most interesting to you at this time, and why?', wordLimit: 200, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'INTELLECTUAL', sortOrder: 1 },
    { promptText: 'What is it about Yale that has led you to apply?', wordLimit: 125, required: true, promptType: 'WHY_SCHOOL', promptCategory: 'WHY_US', sortOrder: 2 },
    { promptText: 'Yale\'s residential colleges regularly host conversations with guests representing a wide range of experiences and accomplishments. What person, past or present, would you invite to speak? What topic would you ask them to discuss, and why?', wordLimit: 400, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'INTELLECTUAL', sortOrder: 3 },
    { promptText: 'What would you do with a free Saturday afternoon?', wordLimit: 35, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'IDENTITY', sortOrder: 4 },
    { promptText: 'If you could teach a college course, what would it be?', wordLimit: 35, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'INTELLECTUAL', sortOrder: 5 },
    { promptText: 'What is something about you that is not represented in your application?', wordLimit: 35, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'IDENTITY', sortOrder: 6 },
  ],
};

const UCHICAGO: SchoolSeed = {
  name: 'University of Chicago',
  slug: 'uchicago',
  location: 'Chicago, IL',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.05,
  websiteUrl: 'https://www.uchicago.edu',
  prompts: [
    { promptText: 'How does the University of Chicago, as you know it now, satisfy your desire for a particular kind of learning, community, and future? Please address with some specificity your own wishes and how they relate to UChicago.', wordLimit: 500, required: true, promptType: 'WHY_SCHOOL', promptCategory: 'WHY_US', sortOrder: 1 },
    { promptText: 'Choose one of the six Extended Essay prompts below and write a response. (UChicago is known for its unconventional, creative essay prompts that change each year.)', wordLimit: 650, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'CREATIVE', sortOrder: 2 },
  ],
};

const DUKE: SchoolSeed = {
  name: 'Duke University',
  slug: 'duke',
  location: 'Durham, NC',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.05,
  websiteUrl: 'https://www.duke.edu',
  prompts: [
    { promptText: 'What is your sense of Duke as a university and a community, and why do you consider it a good match for you? If there is something in particular about our offerings that attracts you, feel free to share that as well.', wordLimit: 250, required: true, promptType: 'WHY_SCHOOL', promptCategory: 'WHY_US', sortOrder: 1 },
    { promptText: 'We believe a wide range of personal perspectives, beliefs, and lived experiences are essential to making Duke a vibrant and meaningful living and learning community. Feel free to share with us anything in this context that might help us better understand you and what you might bring to our community of scholars, learners, and thinkers.', wordLimit: 250, required: false, promptType: 'SUPPLEMENTAL', promptCategory: 'DIVERSITY', sortOrder: 2 },
  ],
};

const JOHNS_HOPKINS: SchoolSeed = {
  name: 'Johns Hopkins University',
  slug: 'johns-hopkins',
  location: 'Baltimore, MD',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.059,
  websiteUrl: 'https://www.jhu.edu',
  prompts: [
    { promptText: 'Tell us about an aspect of your identity (e.g., race, gender, sexuality, religion, community) or a life experience that has shaped you as an individual. How has this influenced what you\'d like to pursue or accomplish at Hopkins?', wordLimit: 350, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'IDENTITY', sortOrder: 1 },
  ],
};

const NORTHWESTERN: SchoolSeed = {
  name: 'Northwestern University',
  slug: 'northwestern',
  location: 'Evanston, IL',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.059,
  websiteUrl: 'https://www.northwestern.edu',
  prompts: [
    { promptText: 'We want to better understand you. What aspect of your background, experiences, or identity has most significantly shaped who you are? How has this impacted your perspective or what you hope to study or pursue at Northwestern?', wordLimit: 300, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'IDENTITY', sortOrder: 1 },
    { promptText: 'Northwestern is a place where we celebrate the idea that "And is greater than Or." How might you contribute to the culture of collaboration and interdisciplinary thinking at Northwestern?', wordLimit: 200, required: false, promptType: 'WHY_SCHOOL', promptCategory: 'WHY_US', sortOrder: 2 },
  ],
};

const UPENN: SchoolSeed = {
  name: 'University of Pennsylvania',
  slug: 'upenn',
  location: 'Philadelphia, PA',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.056,
  websiteUrl: 'https://www.upenn.edu',
  prompts: [
    { promptText: 'Write a short thank-you note to someone you have not yet thanked and would like to acknowledge. (We encourage you to share this letter with that person, if possible, and remember that the note can be written to anyone — a family member, friend, teacher, or simply someone who had an impact on you.)', wordLimit: 150, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'GROWTH', sortOrder: 1 },
    { promptText: 'How will you explore community at Penn? Consider how Penn can shape your perspective, and how your experiences and perspective can shape Penn.', wordLimit: 200, required: true, promptType: 'WHY_SCHOOL', promptCategory: 'WHY_US', sortOrder: 2 },
    { promptText: 'Considering the specific undergraduate school you have selected, describe how you intend to explore your academic and intellectual interests at the University of Pennsylvania.', wordLimit: 200, required: true, promptType: 'WHY_SCHOOL', promptCategory: 'INTELLECTUAL', sortOrder: 3 },
  ],
};

const CALTECH: SchoolSeed = {
  name: 'California Institute of Technology',
  slug: 'caltech',
  location: 'Pasadena, CA',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Caltech Portal',
  acceptanceRate: 0.027,
  websiteUrl: 'https://www.caltech.edu',
  prompts: [
    { promptText: 'If there are aspects of your life or social identity that you feel are not captured elsewhere in this application, please tell us about them below.', wordLimit: 250, required: false, promptType: 'SUPPLEMENTAL', promptCategory: 'IDENTITY', sortOrder: 1 },
    { promptText: 'At Caltech, we investigate some of the most challenging, fundamental problems in science, technology, engineering, and mathematics. Describe an idea, theory, or concept in STEM that excites you. Why is it important to you?', wordLimit: 200, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'INTELLECTUAL', sortOrder: 2 },
    { promptText: 'Caltech\'s values include respect for all community members, openness, and integrity. Tell us about a time you demonstrated one of these values.', wordLimit: 200, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'COMMUNITY', sortOrder: 3 },
    { promptText: 'The creativity, inventiveness, and innovation of Caltech\'s students, faculty, and researchers have won Nobel Prizes and put rovers on Mars. Nevertheless, Caltech\'s community is equally shaped by collaboration and mentorship. Tell us about a way you like to collaborate.', wordLimit: 200, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'COMMUNITY', sortOrder: 4 },
    { promptText: 'Caltech students are often known for their sense of humor. Share something that makes you laugh.', wordLimit: 200, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'IDENTITY', sortOrder: 5 },
  ],
};

const CORNELL: SchoolSeed = {
  name: 'Cornell University',
  slug: 'cornell',
  location: 'Ithaca, NY',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.074,
  websiteUrl: 'https://www.cornell.edu',
  prompts: [
    { promptText: 'At Cornell, students are encouraged to be bold in their thinking. Describe an experience where you embraced curiosity, took a risk, or challenged an assumption. What did you learn?', wordLimit: 350, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'GROWTH', sortOrder: 1 },
    { promptText: 'Describe what you would contribute to and hope to get from your chosen Cornell college or school. (School-specific — varies by college within Cornell.)', wordLimit: 650, required: true, promptType: 'WHY_SCHOOL', promptCategory: 'WHY_US', sortOrder: 2 },
  ],
};

const BROWN: SchoolSeed = {
  name: 'Brown University',
  slug: 'brown',
  location: 'Providence, RI',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.05,
  websiteUrl: 'https://www.brown.edu',
  prompts: [
    { promptText: 'Brown\'s Open Curriculum allows students to explore broadly while also diving deeply into their academic interests. Tell us about any academic interests that excite you, and how you might use the Open Curriculum to pursue them while also embracing topics with which you are unfamiliar.', wordLimit: 250, required: true, promptType: 'WHY_SCHOOL', promptCategory: 'INTELLECTUAL', sortOrder: 1 },
    { promptText: 'Students entering Brown often find that making their home in a new place is not so much about finding where things are, but about finding a sense of belonging. How do you hope to create that sense of belonging at Brown?', wordLimit: 200, required: true, promptType: 'WHY_SCHOOL', promptCategory: 'COMMUNITY', sortOrder: 2 },
    { promptText: 'Brown students care deeply about their community. What kind of community do you hope to find here, and how would you contribute to it?', wordLimit: 200, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'COMMUNITY', sortOrder: 3 },
    { promptText: 'Tell us about a place or community you call home. How has it shaped your perspective?', wordLimit: 100, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'IDENTITY', sortOrder: 4 },
    { promptText: 'What three words best describe you?', wordLimit: 3, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'IDENTITY', sortOrder: 5 },
  ],
};

const DARTMOUTH: SchoolSeed = {
  name: 'Dartmouth College',
  slug: 'dartmouth',
  location: 'Hanover, NH',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.054,
  websiteUrl: 'https://www.dartmouth.edu',
  prompts: [
    { promptText: 'As you seek admission to Dartmouth\'s Class of 2030, what aspects of the college\'s academic program, community, or campus environment attract your interest? In short, why Dartmouth?', wordLimit: 100, required: true, promptType: 'WHY_SCHOOL', promptCategory: 'WHY_US', sortOrder: 1 },
    { promptText: 'There is a Quaker saying: "Let your life speak." Describe the environment in which you were raised and the impact it has had on the person you are today.', wordLimit: 250, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'IDENTITY', sortOrder: 2 },
    { promptText: '"What excites you?" Choose one of the following prompts and respond in 250 words or fewer.', wordLimit: 250, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'INTELLECTUAL', sortOrder: 3 },
  ],
};

const COLUMBIA: SchoolSeed = {
  name: 'Columbia University',
  slug: 'columbia',
  location: 'New York, NY',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.035,
  websiteUrl: 'https://www.columbia.edu',
  prompts: [
    { promptText: 'List a selection of texts, resources, and outlets that have contributed to your intellectual development outside of academic classes, including but not limited to books, journals, websites, podcasts, essays, plays, presentations, videos, museums, and other content you have engaged with.', wordLimit: 100, required: true, promptType: 'SHORT_ANSWER', promptCategory: 'INTELLECTUAL', sortOrder: 1 },
    { promptText: 'A hallmark of the Columbia experience is being able to learn in a community with students who have a wide range of perspectives, backgrounds, and experiences. Tell us about a community that has shaped your perspective.', wordLimit: 150, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'DIVERSITY', sortOrder: 2 },
    { promptText: 'In college/university, students are often challenged in ways that they could not predict or anticipate. It is important to us, therefore, to understand an applicant\'s ability to navigate through adversity. Please describe a barrier or obstacle you have faced and discuss what you have learned from that experience.', wordLimit: 150, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'CHALLENGE', sortOrder: 3 },
    { promptText: 'Why are you interested in attending Columbia University?', wordLimit: 150, required: true, promptType: 'WHY_SCHOOL', promptCategory: 'WHY_US', sortOrder: 4 },
    { promptText: 'What attracts you to your preferred areas of academic interest?', wordLimit: 150, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'INTELLECTUAL', sortOrder: 5 },
  ],
};

const RICE: SchoolSeed = {
  name: 'Rice University',
  slug: 'rice',
  location: 'Houston, TX',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.063,
  websiteUrl: 'https://www.rice.edu',
  prompts: [
    { promptText: 'Please explain why you wish to study in the academic areas you selected.', wordLimit: 150, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'INTELLECTUAL', sortOrder: 1 },
    { promptText: 'Based upon your exploration of Rice University, what elements of the Rice experience appeal to you?', wordLimit: 150, required: true, promptType: 'WHY_SCHOOL', promptCategory: 'WHY_US', sortOrder: 2 },
    { promptText: 'Please share anything else that has not been covered in your application that you would like the admission committee to consider.', wordLimit: 250, required: false, promptType: 'SUPPLEMENTAL', promptCategory: 'OTHER', sortOrder: 3 },
  ],
};

const VANDERBILT: SchoolSeed = {
  name: 'Vanderbilt University',
  slug: 'vanderbilt',
  location: 'Nashville, TN',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.058,
  websiteUrl: 'https://www.vanderbilt.edu',
  prompts: [
    { promptText: 'Vanderbilt offers a community where your experiences and perspectives are valued and contribute to our campus. Please share how a community or group you belong to has shaped your identity and how you see yourself contributing to our campus community.', wordLimit: 250, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'COMMUNITY', sortOrder: 1 },
  ],
};

const CARNEGIE_MELLON: SchoolSeed = {
  name: 'Carnegie Mellon University',
  slug: 'carnegie-mellon',
  location: 'Pittsburgh, PA',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.11,
  websiteUrl: 'https://www.cmu.edu',
  prompts: [
    { promptText: 'Most students choose their intended major or area of study based on a passion or inspiration that is deeply personal. Please share the inspiration behind your intended area of study, whether in the College of Engineering, School of Computer Science, or any other program at Carnegie Mellon.', wordLimit: 300, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'INTELLECTUAL', sortOrder: 1 },
    { promptText: 'Many of our applicants are curious about what sets Carnegie Mellon apart. Share what excites you about attending Carnegie Mellon.', wordLimit: 300, required: true, promptType: 'WHY_SCHOOL', promptCategory: 'WHY_US', sortOrder: 2 },
    { promptText: 'Please submit a one-page, single-spaced essay that explains why you have chosen to apply for your selected major and how your passions, experiences, and goals have led you to this decision.', wordLimit: 300, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'INTELLECTUAL', sortOrder: 3 },
  ],
};

const MICHIGAN: SchoolSeed = {
  name: 'University of Michigan',
  slug: 'michigan',
  location: 'Ann Arbor, MI',
  selectivity: 'HIGHLY_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.15,
  websiteUrl: 'https://www.umich.edu',
  prompts: [
    { promptText: 'Describe the unique qualities that attract you to the specific undergraduate College or School (including preferred admission and dual degree programs) to which you are applying at the University of Michigan. How would that curriculum support your interests?', wordLimit: 550, required: true, promptType: 'WHY_SCHOOL', promptCategory: 'WHY_US', sortOrder: 1 },
    { promptText: 'Everyone belongs to many different communities and/or groups defined by (among other things) shared geography, religion, ethnicity, income, cuisine, interest, race, ideology, or intellectual heritage. Choose one of the communities to which you belong, and describe that community and your place within it.', wordLimit: 300, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'COMMUNITY', sortOrder: 2 },
  ],
};

const NOTRE_DAME: SchoolSeed = {
  name: 'University of Notre Dame',
  slug: 'notre-dame',
  location: 'Notre Dame, IN',
  selectivity: 'MOST_SELECTIVE',
  applicationPlatform: 'Common App',
  acceptanceRate: 0.115,
  websiteUrl: 'https://www.nd.edu',
  prompts: [
    { promptText: 'Everyone has different priorities when considering a college or university. What are yours? Specifically, how does Notre Dame address them?', wordLimit: 150, required: true, promptType: 'WHY_SCHOOL', promptCategory: 'WHY_US', sortOrder: 1 },
    { promptText: 'What is distinctive about your personal experiences and development (e.g. family, cultural, community, or educational experiences) that you feel will enrich our community?', wordLimit: 150, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'DIVERSITY', sortOrder: 2 },
    { promptText: 'Notre Dame\'s mission includes educating the mind, the heart, and the spirit. Which of these areas do you most want to grow in during your time at Notre Dame?', wordLimit: 150, required: true, promptType: 'SUPPLEMENTAL', promptCategory: 'GROWTH', sortOrder: 3 },
  ],
};

// ============================================
// ALL SCHOOLS
// ============================================

export const ALL_SCHOOLS: SchoolSeed[] = [
  COMMON_APP,
  UC_SYSTEM,
  PRINCETON,
  MIT,
  HARVARD,
  STANFORD,
  YALE,
  UCHICAGO,
  DUKE,
  JOHNS_HOPKINS,
  NORTHWESTERN,
  UPENN,
  CALTECH,
  CORNELL,
  BROWN,
  DARTMOUTH,
  COLUMBIA,
  RICE,
  VANDERBILT,
  CARNEGIE_MELLON,
  MICHIGAN,
  NOTRE_DAME,
];

// ============================================
// SEED FUNCTION
// ============================================

export async function seedEssayPrompts(prisma: PrismaClient): Promise<void> {
  console.log('Seeding essay prompts...\n');

  let totalSchools = 0;
  let totalPrompts = 0;

  for (const schoolData of ALL_SCHOOLS) {
    // Upsert school
    const school = await prisma.school.upsert({
      where: { slug: schoolData.slug },
      update: {
        name: schoolData.name,
        location: schoolData.location,
        selectivity: schoolData.selectivity,
        applicationPlatform: schoolData.applicationPlatform,
        acceptanceRate: schoolData.acceptanceRate,
        websiteUrl: schoolData.websiteUrl,
        essayPageUrl: schoolData.essayPageUrl,
      },
      create: {
        name: schoolData.name,
        slug: schoolData.slug,
        location: schoolData.location,
        selectivity: schoolData.selectivity,
        applicationPlatform: schoolData.applicationPlatform,
        acceptanceRate: schoolData.acceptanceRate,
        websiteUrl: schoolData.websiteUrl,
        essayPageUrl: schoolData.essayPageUrl,
      },
    });

    totalSchools++;

    // Upsert prompts for this school
    for (const promptData of schoolData.prompts) {
      // Use a compound key of schoolId + academicYear + sortOrder for idempotent upserts
      const existing = await prisma.essayPrompt.findFirst({
        where: {
          schoolId: school.id,
          academicYear: ACADEMIC_YEAR,
          sortOrder: promptData.sortOrder,
        },
      });

      if (existing) {
        await prisma.essayPrompt.update({
          where: { id: existing.id },
          data: {
            promptText: promptData.promptText,
            wordLimit: promptData.wordLimit,
            charLimit: promptData.charLimit,
            required: promptData.required,
            promptType: promptData.promptType,
            promptCategory: promptData.promptCategory,
            sourceType: 'MANUAL' as PromptSource,
            verifiedAt: new Date(),
          },
        });
      } else {
        await prisma.essayPrompt.create({
          data: {
            schoolId: school.id,
            academicYear: ACADEMIC_YEAR,
            promptText: promptData.promptText,
            wordLimit: promptData.wordLimit,
            charLimit: promptData.charLimit,
            required: promptData.required,
            promptType: promptData.promptType,
            promptCategory: promptData.promptCategory,
            sortOrder: promptData.sortOrder,
            sourceType: 'MANUAL' as PromptSource,
            verifiedAt: new Date(),
          },
        });
      }

      totalPrompts++;
    }

    console.log(`  ${schoolData.name}: ${schoolData.prompts.length} prompts`);
  }

  console.log(`\nSeeded ${totalSchools} schools with ${totalPrompts} prompts.\n`);
}
