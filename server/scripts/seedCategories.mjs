import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { nanoid } from "nanoid";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const categories = [
  {
    name: "Customer Support",
    description: "Templates for customer service, support tickets, and user communication",
    icon: "Headphones",
  },
  {
    name: "Marketing",
    description: "Marketing copy, email campaigns, social media posts, and ad content",
    icon: "Megaphone",
  },
  {
    name: "Code Generation",
    description: "Generate code, debug issues, write tests, and technical documentation",
    icon: "Code",
  },
  {
    name: "Data Analysis",
    description: "Analyze data, generate insights, create reports, and visualizations",
    icon: "BarChart",
  },
  {
    name: "Creative Writing",
    description: "Stories, blog posts, articles, creative content, and copywriting",
    icon: "Pen",
  },
  {
    name: "Education",
    description: "Teaching materials, lesson plans, quizzes, and educational content",
    icon: "GraduationCap",
  },
  {
    name: "Business",
    description: "Business plans, proposals, presentations, and professional documents",
    icon: "Briefcase",
  },
  {
    name: "Research",
    description: "Research summaries, literature reviews, and academic writing",
    icon: "BookOpen",
  },
];

async function seedCategories() {
  console.log("Connecting to database...");
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  console.log("Seeding template categories...");

  for (const category of categories) {
    const id = nanoid();
    await connection.execute(
      "INSERT INTO templateCategories (id, name, description, icon, createdAt) VALUES (?, ?, ?, ?, NOW())",
      [id, category.name, category.description, category.icon]
    );
    console.log(`✓ Created category: ${category.name}`);
  }

  await connection.end();
  console.log("✅ Seeding complete!");
}

seedCategories().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
