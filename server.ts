import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import { exec } from "child_process";
import fs from "fs";
import { promisify } from "util";
import os from "os";

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const execPromise = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uri = process.env.MONGO_URI || "mongodb+srv://admin:admin123@quizmaster-pro.nesqvfa.mongodb.net/quizmaster?retryWrites=true&w=majority&appName=QuizMaster-Pro";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    deprecationErrors: true,
  }
});

let db: any;

async function connectDB() {
  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    db = client.db();
    console.log("Connected to MongoDB Atlas");
    
    // Ensure admin user exists
    const users = db.collection("users");
    const adminExists = await users.findOne({ role: "admin" });
    if (!adminExists) {
      await users.insertOne({
        username: "admin",
        password: "admin123",
        batch: "N/A",
        role: "admin",
        student_id: "admin"
      });
      console.log("Created default admin user");
    }

    // Create indexes
    await users.createIndex({ student_id: 1 }, { unique: true, sparse: true });
    
  } catch (error) {
    console.error("MongoDB connection error:", error);
    console.log("Server will continue running in limited mode. Please check MONGO_URI.");
    // Do not exit, allow server to boot so user can see it's up but failing DB calls
  }
}

async function startServer() {
  await connectDB();

  try {
    const app = express();
    const PORT = 3000;

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
      next();
    });

    // API Routes
    app.use((req, res, next) => {
      if (!db && req.path.startsWith('/api')) {
        return res.status(503).json({ error: "Database connection not established. Please check server logs and MONGO_URI." });
      }
      next();
    });
    
    // Auth
    app.post("/api/auth/login", async (req, res) => {
      const { username, password } = req.body;
      const users = db.collection("users");
      
      let user = await users.findOne({ username, password, role: 'admin' });
      
      if (!user) {
        user = await users.findOne({ student_id: username, password, role: 'student' });
      }

      if (user) {
        const userObj = { ...user, id: user._id.toString() };
        delete userObj._id;
        res.json({ success: true, user: userObj });
      } else {
        res.status(401).json({ success: false, message: "Invalid credentials. Students must use their Register Number/Student ID." });
      }
    });

    // Users
    app.get("/api/users", async (req, res) => {
      const users = await db.collection("users").find({ role: 'student' }).sort({ student_id: 1 }).toArray();
      res.json(users.map((u: any) => ({ ...u, id: u._id.toString() })));
    });

    app.post("/api/users", async (req, res) => {
      const { username, password, batch, student_id, department } = req.body;
      try {
        const result = await db.collection("users").insertOne({
          username, password, batch, student_id, department, role: 'student'
        });
        res.json({ id: result.insertedId.toString() });
      } catch (e: any) {
        if (e.code === 11000) {
          res.status(400).json({ error: "Student ID / Register Number already exists" });
        } else {
          console.error("Create user error:", e);
          res.status(500).json({ error: "Failed to create user." });
        }
      }
    });

    app.delete("/api/users/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await db.collection("users").deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount > 0) {
          res.json({ success: true });
        } else {
          res.status(404).json({ error: "User not found" });
        }
      } catch (e: any) {
        console.error("Delete user error:", e);
        res.status(500).json({ error: `Failed to delete user: ${e.message}` });
      }
    });

    app.post("/api/users/bulk-delete", async (req, res) => {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "No user IDs provided" });
      }
      try {
        const objectIds = ids.map((id: string) => new ObjectId(id));
        const result = await db.collection("users").deleteMany({ _id: { $in: objectIds } });
        res.json({ success: true, deletedCount: result.deletedCount });
      } catch (e: any) {
        console.error("Bulk delete users error:", e);
        res.status(500).json({ error: `Failed to delete users: ${e.message}` });
      }
    });

    app.get("/api/batches", async (req, res) => {
      const batches = await db.collection("users").distinct("batch", { role: 'student' });
      res.json(batches);
    });

    app.post("/api/users/bulk", async (req, res) => {
      const { users } = req.body;
      if (!users || !Array.isArray(users)) {
        return res.status(400).json({ error: "Invalid data format" });
      }

      try {
        const usersToInsert = users.map((u: any) => ({
          ...u,
          role: 'student'
        }));
        await db.collection("users").insertMany(usersToInsert, { ordered: false });
        res.json({ success: true });
      } catch (e: any) {
        if (e.code === 11000) {
           res.json({ success: true, message: "Some users were skipped due to duplicate Student IDs" });
        } else {
           console.error("Bulk upload error:", e);
           res.status(400).json({ error: `Failed to bulk upload users: ${e.message}` });
        }
      }
    });

    app.post("/api/users/change-password", async (req, res) => {
      const { userId, newPassword } = req.body;
      try {
        await db.collection("users").updateOne(
          { _id: new ObjectId(userId) },
          { $set: { password: newPassword } }
        );
        res.json({ success: true });
      } catch (e) {
        res.status(500).json({ error: "Failed to update password" });
      }
    });

    // Tests
    app.get("/api/tests", async (req, res) => {
      const batch = req.query.batch;
      let query: any = {};
      if (batch) {
        query = {
          $or: [{ target_batch: batch }, { target_batch: 'All' }],
          is_published: 1
        };
      }
      const tests = await db.collection("tests").find(query).sort({ created_at: -1 }).toArray();
      res.json(tests.map((t: any) => ({ ...t, id: t._id.toString() })));
    });

    app.post("/api/tests", async (req, res) => {
      const { title, description, duration_minutes, target_batch, negative_marks, type, allowed_languages, start_time, end_time } = req.body;
      try {
        const result = await db.collection("tests").insertOne({
          title, 
          description, 
          duration_minutes: parseInt(duration_minutes), 
          target_batch, 
          type: type || 'mcq',
          negative_marks: negative_marks ? 1 : 0,
          is_published: 0,
          allowed_languages: allowed_languages || ['python', 'javascript', 'java', 'c', 'cpp'],
          start_time: start_time || null,
          end_time: end_time || null,
          created_at: new Date().toISOString()
        });
        res.json({ id: result.insertedId.toString() });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.delete("/api/tests/:id", async (req, res) => {
      const { id } = req.params;
      try {
        await db.collection("results").deleteMany({ test_id: id });
        await db.collection("questions").deleteMany({ test_id: id });
        const result = await db.collection("tests").deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount > 0) {
          res.json({ success: true });
        } else {
          res.status(404).json({ error: "Test not found" });
        }
      } catch (e: any) {
        console.error("Delete test error:", e);
        res.status(500).json({ error: `Failed to delete test: ${e.message}` });
      }
    });

    app.post("/api/tests/:id/publish", async (req, res) => {
      const { id } = req.params;
      const { published } = req.body;
      try {
        await db.collection("tests").updateOne(
          { _id: new ObjectId(id) },
          { $set: { is_published: published ? 1 : 0 } }
        );
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.put("/api/tests/:id", async (req, res) => {
      const { id } = req.params;
      const { title, description, duration_minutes, target_batch, negative_marks, type, allowed_languages, start_time, end_time } = req.body;
      try {
        await db.collection("tests").updateOne(
          { _id: new ObjectId(id) },
          { $set: { 
            title, 
            description, 
            duration_minutes: parseInt(duration_minutes), 
            target_batch, 
            negative_marks: negative_marks ? 1 : 0,
            type: type || 'mcq',
            allowed_languages: allowed_languages || ['python', 'javascript', 'java', 'c', 'cpp'],
            start_time: start_time || null,
            end_time: end_time || null
          } }
        );
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    // Questions & Options
    app.get("/api/tests/:id/questions", async (req, res) => {
      const questions = await db.collection("questions").find({ test_id: req.params.id }).toArray();
      res.json(questions.map((q: any) => ({ 
        ...q, 
        id: q._id.toString(),
        options: (q.options || []).map((opt: any, i: number) => ({
           ...opt,
           id: `${q._id.toString()}-opt-${i}`,
           question_id: q._id.toString()
        }))
      })));
    });

    app.post("/api/tests/:id/questions", async (req, res) => {
      try {
        const { question_text, correct_option_index, options, image_url, explanation, bank_question_id } = req.body;
        const testId = req.params.id;

        const formattedOptions = options.map((opt: string, index: number) => ({
          option_text: opt,
          option_index: index
        }));

        const result = await db.collection("questions").insertOne({
          test_id: testId,
          question_text,
          correct_option_index,
          image_url: image_url || null,
          options: formattedOptions,
          explanation: explanation || null,
          bank_question_id: bank_question_id || null
        });
        res.json({ id: result.insertedId.toString() });
      } catch (e: any) {
        console.error("Add question error:", e);
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/api/tests/:id/generate-questions", async (req, res) => {
      const { bank_ids, total_questions } = req.body;
      const testId = req.params.id;

      if (!bank_ids || bank_ids.length === 0 || !total_questions) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      try {
        const questionsPerBank = Math.floor(total_questions / bank_ids.length);
        let remainingQuestions = total_questions % bank_ids.length;
        let addedCount = 0;

        for (const bankId of bank_ids) {
          let limit = questionsPerBank;
          if (remainingQuestions > 0) {
            limit++;
            remainingQuestions--;
          }

          if (limit === 0) continue;

          const bankQuestions = await db.collection("bank_questions")
            .aggregate([
              { $match: { bank_id: bankId } },
              { $sample: { size: limit } }
            ]).toArray();

          if (bankQuestions.length > 0) {
            const questionsToInsert = bankQuestions.map((bq: any) => ({
              test_id: testId,
              question_text: bq.question_text,
              correct_option_index: bq.correct_option_index,
              image_url: bq.image_url,
              options: bq.options,
              explanation: bq.explanation || null,
              bank_question_id: bq._id.toString()
            }));
            
            await db.collection("questions").insertMany(questionsToInsert);
            addedCount += questionsToInsert.length;
          }
        }
        res.json({ success: true, addedCount });
      } catch (e: any) {
        console.error("Generate questions error:", e);
        res.status(500).json({ error: e.message });
      }
    });

    app.delete("/api/questions/:id", async (req, res) => {
      try {
        await db.collection("questions").deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.put("/api/questions/:id", async (req, res) => {
      const { id } = req.params;
      const { question_text, correct_option_index, options, image_url, explanation } = req.body;
      
      try {
        const formattedOptions = options.map((opt: string, index: number) => ({
          option_text: opt,
          option_index: index
        }));

        // Find existing to check for bank link
        const existing = await db.collection("questions").findOne({ _id: new ObjectId(id) });

        await db.collection("questions").updateOne(
          { _id: new ObjectId(id) },
          { $set: { 
              question_text, 
              correct_option_index, 
              image_url: image_url || null,
              options: formattedOptions,
              explanation: explanation || null
            } 
          }
        );

        if (existing && existing.bank_question_id) {
          await db.collection("bank_questions").updateOne(
            { _id: new ObjectId(existing.bank_question_id) },
            { $set: {
                question_text,
                correct_option_index,
                image_url: image_url || null,
                options: formattedOptions,
                explanation: explanation || null
              }
            }
          );
        }

        res.json({ success: true });
      } catch (e: any) {
        console.error("Update question error:", e);
        res.status(500).json({ error: e.message });
      }
    });

    // Coding Problems
    app.get("/api/tests/:id/problems", async (req, res) => {
      const problems = await db.collection("coding_problems").find({ test_id: req.params.id }).toArray();
      res.json(problems.map((p: any) => ({ ...p, id: p._id.toString() })));
    });

    app.post("/api/tests/:id/problems", async (req, res) => {
      try {
        const { title, description, constraints, input_format, output_format, sample_input, sample_output, test_cases, bank_problem_id } = req.body;
        const testId = req.params.id;
        console.log(`Creating problem for test ${testId}:`, title);

        const result = await db.collection("coding_problems").insertOne({
          test_id: testId,
          title,
          description,
          constraints,
          input_format,
          output_format,
          sample_input,
          sample_output,
          test_cases: test_cases || [],
          bank_problem_id: bank_problem_id || null
        });
        console.log(`Created problem ${result.insertedId} for test ${testId}`);
        res.json({ id: result.insertedId.toString() });
      } catch (e: any) {
        console.error("Add coding problem error:", e);
        res.status(500).json({ error: e.message });
      }
    });

    app.delete("/api/problems/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await db.collection("coding_problems").deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount > 0) {
          res.json({ success: true });
        } else {
          res.status(404).json({ error: "Problem not found" });
        }
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.put("/api/problems/:id", async (req, res) => {
      const { id } = req.params;
      const { title, description, constraints, input_format, output_format, sample_input, sample_output, test_cases } = req.body;
      console.log(`Updating problem ${id}:`, title);
      try {
        // Find existing to check for bank link
        const existing = await db.collection("coding_problems").findOne({ _id: new ObjectId(id) });

        const result = await db.collection("coding_problems").updateOne(
          { _id: new ObjectId(id) },
          { $set: { title, description, constraints, input_format, output_format, sample_input, sample_output, test_cases } }
        );

        if (existing && existing.bank_problem_id) {
          await db.collection("bank_coding_problems").updateOne(
            { _id: new ObjectId(existing.bank_problem_id) },
            { $set: { title, description, constraints, input_format, output_format, sample_input, sample_output, test_cases } }
          );
        }

        console.log(`Update problem ${id} result:`, result.modifiedCount);
        res.json({ success: true, modifiedCount: result.modifiedCount });
      } catch (e: any) {
        console.error(`Update problem ${id} error:`, e);
        res.status(500).json({ error: e.message });
      }
    });

    // Question Banks
    app.get("/api/question-banks", async (req, res) => {
      const banks = await db.collection("question_banks").find().sort({ created_at: -1 }).toArray();
      res.json(banks.map((b: any) => ({ ...b, id: b._id.toString() })));
    });

    app.get("/api/question-banks/:id", async (req, res) => {
      const bank = await db.collection("question_banks").findOne({ _id: new ObjectId(req.params.id) });
      if (bank) {
        res.json({ ...bank, id: bank._id.toString() });
      } else {
        res.status(404).json({ error: "Question bank not found" });
      }
    });

    app.post("/api/question-banks", async (req, res) => {
      const { title } = req.body;
      try {
        const result = await db.collection("question_banks").insertOne({
          title,
          created_at: new Date().toISOString()
        });
        res.json({ id: result.insertedId.toString() });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/api/question-banks/bulk", async (req, res) => {
      const { banks } = req.body;
      if (!banks || !Array.isArray(banks)) {
        return res.status(400).json({ error: "Invalid data format. Expected an array of banks." });
      }

      try {
        let createdBanks = 0;
        let createdQuestions = 0;

        for (const bank of banks) {
          if (!bank.title) continue;

          // Create Bank
          const bankResult = await db.collection("question_banks").insertOne({
            title: bank.title,
            created_at: new Date().toISOString()
          });
          const bankId = bankResult.insertedId.toString();
          createdBanks++;

          // Create Questions for this Bank
          if (bank.questions && Array.isArray(bank.questions)) {
            const questionsToInsert = bank.questions.map((q: any) => {
              const formattedOptions = (q.options || []).map((opt: string, index: number) => ({
                option_text: opt,
                option_index: index
              }));

              return {
                bank_id: bankId,
                question_text: q.question_text,
                correct_option_index: q.correct_option_index,
                image_url: q.image_url || null,
                options: formattedOptions,
                explanation: q.explanation || null
              };
            });

            if (questionsToInsert.length > 0) {
              await db.collection("bank_questions").insertMany(questionsToInsert);
              createdQuestions += questionsToInsert.length;
            }
          }
        }

        res.json({ success: true, createdBanks, createdQuestions });
      } catch (e: any) {
        console.error("Bulk upload banks error:", e);
        res.status(500).json({ error: e.message });
      }
    });

    app.delete("/api/question-banks/:id", async (req, res) => {
      const { id } = req.params;
      try {
        await db.collection("bank_questions").deleteMany({ bank_id: id });
        await db.collection("question_banks").deleteOne({ _id: new ObjectId(id) });
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.put("/api/question-banks/:id", async (req, res) => {
      const { id } = req.params;
      const { title } = req.body;
      try {
        await db.collection("question_banks").updateOne(
          { _id: new ObjectId(id) },
          { $set: { title } }
        );
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get("/api/question-banks/:id/questions", async (req, res) => {
      const questions = await db.collection("bank_questions").find({ bank_id: req.params.id }).toArray();
      res.json(questions.map((q: any) => ({ 
        ...q, 
        id: q._id.toString(),
        options: (q.options || []).map((opt: any, i: number) => ({
           ...opt,
           id: `${q._id.toString()}-opt-${i}`,
           question_id: q._id.toString()
        }))
      })));
    });

    app.post("/api/question-banks/:id/questions", async (req, res) => {
      try {
        const { question_text, correct_option_index, options, image_url, explanation } = req.body;
        const bankId = req.params.id;

        const formattedOptions = options.map((opt: string, index: number) => ({
          option_text: opt,
          option_index: index
        }));

        const result = await db.collection("bank_questions").insertOne({
          bank_id: bankId,
          question_text,
          correct_option_index,
          image_url: image_url || null,
          options: formattedOptions,
          explanation: explanation || null
        });
        res.json({ id: result.insertedId.toString() });
      } catch (e: any) {
        console.error("Add bank question error:", e);
        res.status(500).json({ error: e.message });
      }
    });

    app.delete("/api/bank-questions/:id", async (req, res) => {
      try {
        await db.collection("bank_questions").deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    // Coding Question Banks
    app.get("/api/coding-banks", async (req, res) => {
      try {
        const banks = await db.collection("coding_banks").find().sort({ created_at: -1 }).toArray();
        res.json(banks.map((b: any) => ({ ...b, id: b._id.toString() })));
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get("/api/coding-banks/all-problems", async (req, res) => {
      try {
        const problems = await db.collection("bank_coding_problems").find().toArray();
        res.json(problems.map((p: any) => ({ ...p, id: p._id.toString() })));
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get("/api/coding-banks/:id", async (req, res) => {
      try {
        const bank = await db.collection("coding_banks").findOne({ _id: new ObjectId(req.params.id) });
        if (bank) {
          res.json({ ...bank, id: bank._id.toString() });
        } else {
          res.status(404).json({ error: "Coding question bank not found" });
        }
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/api/coding-banks", async (req, res) => {
      const { title } = req.body;
      try {
        const result = await db.collection("coding_banks").insertOne({
          title,
          created_at: new Date().toISOString()
        });
        res.json({ id: result.insertedId.toString() });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.delete("/api/coding-banks/:id", async (req, res) => {
      const { id } = req.params;
      try {
        await db.collection("bank_coding_problems").deleteMany({ bank_id: id });
        await db.collection("coding_banks").deleteOne({ _id: new ObjectId(id) });
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.put("/api/coding-banks/:id", async (req, res) => {
      const { id } = req.params;
      const { title } = req.body;
      try {
        await db.collection("coding_banks").updateOne(
          { _id: new ObjectId(id) },
          { $set: { title } }
        );
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get("/api/coding-banks/:id/problems", async (req, res) => {
      try {
        const problems = await db.collection("bank_coding_problems").find({ bank_id: req.params.id }).toArray();
        res.json(problems.map((p: any) => ({ ...p, id: p._id.toString() })));
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/api/coding-banks/:id/problems", async (req, res) => {
      try {
        const { title, description, constraints, input_format, output_format, sample_input, sample_output, test_cases } = req.body;
        const bankId = req.params.id;
        console.log(`Creating bank problem for bank ${bankId}:`, title);

        const result = await db.collection("bank_coding_problems").insertOne({
          bank_id: bankId,
          title,
          description,
          constraints,
          input_format,
          output_format,
          sample_input,
          sample_output,
          test_cases // Array of { input, expected_output, is_hidden }
        });
        console.log(`Created bank problem ${result.insertedId} for bank ${bankId}`);
        res.json({ id: result.insertedId.toString() });
      } catch (e: any) {
        console.error("Add bank coding problem error:", e);
        res.status(500).json({ error: e.message });
      }
    });

    app.delete("/api/bank-coding-problems/:id", async (req, res) => {
      try {
        await db.collection("bank_coding_problems").deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.put("/api/bank-coding-problems/:id", async (req, res) => {
      const { id } = req.params;
      const { title, description, constraints, input_format, output_format, sample_input, sample_output, test_cases } = req.body;
      console.log(`Updating bank problem ${id}:`, title);
      try {
        const result = await db.collection("bank_coding_problems").updateOne(
          { _id: new ObjectId(id) },
          { $set: { title, description, constraints, input_format, output_format, sample_input, sample_output, test_cases } }
        );
        console.log(`Update bank problem ${id} result:`, result.modifiedCount);
        res.json({ success: true, modifiedCount: result.modifiedCount });
      } catch (e: any) {
        console.error(`Update bank problem ${id} error:`, e);
        res.status(500).json({ error: e.message });
      }
    });

    app.put("/api/bank-questions/:id", async (req, res) => {
      const { id } = req.params;
      const { question_text, correct_option_index, options, image_url, explanation } = req.body;
      
      try {
        const formattedOptions = options.map((opt: string, index: number) => ({
          option_text: opt,
          option_index: index
        }));

        await db.collection("bank_questions").updateOne(
          { _id: new ObjectId(id) },
          { $set: { 
              question_text, 
              correct_option_index, 
              image_url: image_url || null,
              options: formattedOptions,
              explanation: explanation || null
            } 
          }
        );
        res.json({ success: true });
      } catch (e: any) {
        console.error("Update bank question error:", e);
        res.status(500).json({ error: e.message });
      }
    });

    // Shared language map for Wandbox
    const wandboxLanguageMap: Record<string, string> = {
      "python": "cpython-3.12.7",
      "python3": "cpython-3.12.7",
      "javascript": "nodejs-20.17.0",
      "java": "openjdk-jdk-21+35",
      "c": "gcc-13.2.0-c",
      "cpp": "gcc-13.2.0"
    };

    // Helper to evaluate a coding solution against all test cases
    const evaluateCodingSolution = async (problemId: string, code: string, language: string) => {
      try {
        const problem = await db.collection("coding_problems").findOne({ _id: new ObjectId(problemId) })
                     || await db.collection("bank_coding_problems").findOne({ _id: new ObjectId(problemId) });
        
        if (!problem) return { passed: 0, total: 0, status: 'Error: Problem not found', results: [] };

        const testCases = problem.test_cases || [];
        const wandboxCompiler = wandboxLanguageMap[language];
        
        if (!wandboxCompiler) return { passed: 0, total: testCases.length, status: 'Error: Language not supported', results: [] };

        let passedCount = 0;
        let results = [];
        for (const tc of testCases) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000); // 10s per test case for graduation/submission

          try {
            const response = await fetch("https://wandbox.org/api/compile.json", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                compiler: wandboxCompiler,
                code: code,
                stdin: (tc.input || "").toString(),
                save: false
              }),
              signal: controller.signal
            });
            clearTimeout(timeout);

            if (response.ok) {
              const res = await response.json() as any;
              const programOutput = (res.program_output || "").trim();
              const programError = (res.program_error || "").trim();
              const compilerError = (res.compiler_error || "").trim();
              const expected = (tc.expected_output || "").trim();
              const isPassed = String(res.status) === "0" && programOutput === expected;
              
              if (isPassed) {
                passedCount++;
              }

              results.push({
                status: isPassed ? 'Passed' : 'Failed',
                actual_output: programOutput,
                error_message: programError || compilerError || (String(res.status) !== "0" ? "Runtime Error" : null),
                is_hidden: tc.is_hidden,
                input: tc.input,
                expected_output: tc.expected_output
              });
            } else {
              results.push({
                status: 'Error',
                error_message: `Service Error ${response.status}`,
                is_hidden: tc.is_hidden,
                input: tc.input,
                expected_output: tc.expected_output
              });
            }
          } catch (e: any) {
            console.error(`Submission grading error for problem ${problemId} test case:`, e);
            results.push({
              status: 'Error',
              error_message: e.message || "Timeout",
              is_hidden: tc.is_hidden,
              input: tc.input,
              expected_output: tc.expected_output
            });
          }
        }

        return {
          passed: passedCount,
          total: testCases.length,
          status: passedCount === testCases.length ? 'Accepted' : 'Partially Accepted',
          results: results
        };
      } catch (e: any) {
        console.error("Evaluation error:", e);
        return { passed: 0, total: 0, status: 'Error: Evaluation failed', results: [] };
      }
    };

    // Results
    app.post("/api/results", async (req, res) => {
      const { test_id, student_name, student_id, score, total_questions, responses, coding_details } = req.body;
      
      try {
        let finalScore = score;
        let processedCodingDetails = [];

        if (coding_details && coding_details.length > 0) {
          console.log(`Grading coding results for student ${student_name}...`);
          let totalPassedTotal = 0;
          let totalPossibleCases = 0;

          // Process problems one by one to avoid overwhelming Wandbox easily
          for (const cd of coding_details) {
            const evaluation = await evaluateCodingSolution(cd.problem_id, cd.solution_code, cd.language);
            processedCodingDetails.push({
              problem_id: cd.problem_id,
              problem_title: cd.problem_title,
              solution_code: cd.solution_code,
              language: cd.language,
              test_cases_passed: evaluation.passed,
              total_test_cases: evaluation.total,
              status: evaluation.status,
              test_case_results: evaluation.results
            });
            totalPassedTotal += evaluation.passed;
            totalPossibleCases += evaluation.total;
          }
          
          // Recalculate score for coding tests: typically (passed / total) * 100 or similar
          // This depends on the specific scoring logic intended.
          // For now let's assume total score is number of problems fully passed or weighted by test cases.
          // Let's use weighted score by test cases if it's a coding test.
          if (totalPossibleCases > 0) {
            finalScore = Math.round((totalPassedTotal / totalPossibleCases) * total_questions);
          }
        }

        const result = await db.collection("results").insertOne({
          test_id,
          student_name,
          student_id,
          score: finalScore,
          total_questions,
          responses: responses ? JSON.stringify(responses) : null,
          coding_details: processedCodingDetails.length > 0 ? processedCodingDetails : null,
          completed_at: new Date().toISOString()
        });

        res.json({ 
          id: result.insertedId.toString(),
          score: finalScore,
          coding_details: processedCodingDetails
        });
      } catch (e: any) {
        console.error("Submit results error:", e);
        res.status(500).json({ error: e.message });
      }
    });

    app.get("/api/results", async (req, res) => {
      const studentId = req.query.student_id as string;
      try {
        let query = {};
        if (studentId) {
          const trimmedId = studentId.trim();
          const escapedId = trimmedId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          query = { student_id: { $regex: new RegExp(`^\\s*${escapedId}\\s*$`, 'i') } };
        }
        
        const results = await db.collection("results").aggregate([
          { $match: query },
          { 
            $addFields: { 
              test_id_obj: { 
                $convert: {
                  input: "$test_id",
                  to: "objectId",
                  onError: null,
                  onNull: null
                }
              } 
            } 
          },
          {
            $lookup: {
              from: "tests",
              localField: "test_id_obj",
              foreignField: "_id",
              as: "test"
            }
          },
          { $unwind: { path: "$test", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              test_id: 1,
              student_name: 1,
              student_id: 1,
              score: 1,
              total_questions: 1,
              responses: 1,
              coding_details: 1,
              completed_at: 1,
              test_type: "$test.type",
              test_title: { $ifNull: ["$test.title", "Unknown Test"] }
            }
          },
          { $sort: { completed_at: -1 } }
        ]).toArray();

        res.json(results.map((r: any) => ({ ...r, id: r._id.toString() })));
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get("/api/tests/:id/results", async (req, res) => {
      const { id } = req.params;
      try {
        const results = await db.collection("results").aggregate([
          { $match: { test_id: id } },
          { 
            $addFields: { 
              test_id_obj: { 
                $convert: {
                  input: "$test_id",
                  to: "objectId",
                  onError: null,
                  onNull: null
                }
              } 
            } 
          },
          {
            $lookup: {
              from: "tests",
              localField: "test_id_obj",
              foreignField: "_id",
              as: "test"
            }
          },
          { $unwind: { path: "$test", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              test_id: 1,
              student_name: 1,
              student_id: 1,
              score: 1,
              total_questions: 1,
              responses: 1,
              coding_details: 1,
              completed_at: 1,
              test_type: "$test.type",
              test_title: { $ifNull: ["$test.title", "Unknown Test"] }
            }
          },
          { $sort: { score: -1, completed_at: 1 } },
          {
            $group: {
              _id: "$student_id",
              result: { $first: "$$ROOT" }
            }
          },
          { $replaceRoot: { newRoot: "$result" } },
          { $sort: { score: -1, completed_at: 1 } }
        ]).toArray();

        res.json(results.map((r: any) => ({ ...r, id: r._id.toString() })));
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.delete("/api/results/:id", async (req, res) => {
      try {
        await db.collection("results").deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/api/run-code", async (req, res) => {
      const { problem_id, code, language, run_all } = req.body;
      
      try {
        const problem = await db.collection("coding_problems").findOne({ _id: new ObjectId(problem_id) }) 
                     || await db.collection("bank_coding_problems").findOne({ _id: new ObjectId(problem_id) });

        if (!problem) return res.status(404).json({ error: "Problem not found" });

        const testCases = problem.test_cases || [];
        
        // Filter based on run_all flag
        let testCasesToRun = [];
        if (run_all) {
          testCasesToRun = testCases.length > 0 ? testCases : [{ input: "", expected_output: "", is_hidden: false }];
        } else {
          const publicCases = testCases.filter((tc: any) => !tc.is_hidden);
          testCasesToRun = publicCases.length > 0 ? publicCases : [testCases[0] || { input: "", expected_output: "", is_hidden: false }];
        }
        
        const wandboxCompiler = wandboxLanguageMap[language];
        if (!wandboxCompiler) return res.status(400).json({ error: `Language ${language} is not supported.` });

        const results = [];
        let allPassed = true;

        for (const tc of testCasesToRun) {
          const stdinValue = (tc.input || "").toString();
          
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000); // 15s per test case

          try {
            const response = await fetch("https://wandbox.org/api/compile.json", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                compiler: wandboxCompiler,
                code: code,
                stdin: stdinValue,
                save: false
              }),
              signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
              results.push({
                input: tc.input,
                expected: tc.expected_output,
                actual: "Error: Execution service failed",
                success: false,
                is_hidden: tc.is_hidden,
                error: `Service returned ${response.status}`
              });
              allPassed = false;
              continue;
            }

            const wandboxRes = await response.json() as any;
            const programOutput = (wandboxRes.program_output || "").trim();
            const programError = (wandboxRes.program_error || "").trim();
            const compilerError = (wandboxRes.compiler_error || "").trim();
            const errorMsg = programError || compilerError;
            const expected = (tc.expected_output || "").trim();
            
            const isSuccess = String(wandboxRes.status) === "0" && programOutput === expected;
            if (!isSuccess) allPassed = false;

            results.push({
              input: tc.input,
              expected: expected,
              actual: programOutput || errorMsg || wandboxRes.program_message || wandboxRes.compiler_message,
              success: isSuccess,
              is_hidden: tc.is_hidden,
              error: errorMsg || (String(wandboxRes.status) !== "0" && !programOutput ? "Process exited with non-zero status" : null)
            });

          } catch (e: any) {
            results.push({
              input: tc.input,
              expected: tc.expected_output,
              actual: "Execution Timeout/Error",
              success: false,
              error: e.message
            });
            allPassed = false;
          }
        }

        res.json({
          success: allPassed,
          testResults: results,
          passed_count: results.filter(r => r.success).length,
          total_count: results.length
        });

      } catch (e: any) {
        console.error("Run code error:", e);
        res.status(500).json({ error: e.message });
      }
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      app.use(express.static(path.join(__dirname, "dist")));
      app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "dist", "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
