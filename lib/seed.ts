import type Database from "better-sqlite3";
import type { NewCard, NewQuestion } from "./types";

interface SeedLecture {
  title: string;
  summary: string;
  cards: NewCard[];
  questions: NewQuestion[];
}

function insertLectures(
  db: Database.Database,
  classId: number,
  lectures: SeedLecture[],
) {
  const insLecture = db.prepare(
    "INSERT INTO lectures (class_id, title, format, position, summary, content) VALUES (?, ?, 'cards', ?, ?, ?)",
  );
  const insQuestion = db.prepare(
    "INSERT INTO questions (lecture_id, prompt, options, answer_index, explanation) VALUES (?, ?, ?, ?, ?)",
  );
  lectures.forEach((lec, i) => {
    const { lastInsertRowid } = insLecture.run(
      classId,
      lec.title,
      i + 1,
      lec.summary,
      JSON.stringify({ cards: lec.cards }),
    );
    for (const q of lec.questions) {
      insQuestion.run(
        lastInsertRowid,
        q.prompt,
        JSON.stringify(q.options),
        q.answer_index,
        q.explanation,
      );
    }
  });
}

export function seed(db: Database.Database) {
  const insSchool = db.prepare(
    "INSERT INTO schools (name, slug, emoji, description) VALUES (?, ?, ?, ?)",
  );
  const insClass = db.prepare(
    "INSERT INTO classes (school_id, name, slug, emoji, description) VALUES (?, ?, ?, ?, ?)",
  );

  const finance = insSchool.run(
    "School of Finance",
    "finance",
    "💰",
    "Money, markets, and how value moves through the world.",
  ).lastInsertRowid as number;

  const equities = insClass.run(
    finance,
    "Equities 101",
    "equities-101",
    "📈",
    "What stocks are, why they exist, and how people make (and lose) money with them.",
  ).lastInsertRowid as number;

  insertLectures(db, equities, [
    {
      title: "What is a stock?",
      summary: "Ownership, shares, and why companies sell pieces of themselves.",
      cards: [
        {
          front: "A stock is a tiny slice of ownership",
          back: "When you buy a share, you own a fraction of the whole company — its brand, factories, cash, and future profits.",
          example:
            "Buy 1 Apple share and you own roughly one 15-billionth of Apple. Tiny, but real: you can even vote at shareholder meetings.",
        },
        {
          front: "Why do companies sell stock?",
          back: "To raise money without borrowing. Selling shares trades a slice of future profits for cash today — no loan, no interest payments.",
          example:
            "In 2012 Facebook raised $16B in its IPO and used the cash to fund growth instead of taking on debt.",
        },
        {
          front: "Share price = supply and demand",
          back: "A share is worth exactly what the next person will pay. Prices move when opinions about the company's future change.",
          example:
            "When a company beats earnings expectations, more buyers show up than sellers — the price gets bid up within seconds.",
        },
        {
          front: "Two ways to earn from a stock",
          back: "1) Price appreciation — sell higher than you bought. 2) Dividends — the company mails you a share of its profit, usually quarterly.",
          example:
            "Coca-Cola has paid a dividend every year since 1920. Holders earn even in years the price goes nowhere.",
        },
      ],
      questions: [
        {
          prompt: "Owning a share of stock means you…",
          options: [
            "Lent the company money",
            "Own a fraction of the company",
            "Are owed a fixed interest payment",
            "Work for the company",
          ],
          answer_index: 1,
          explanation:
            "A share is equity — partial ownership. Lending money with fixed interest describes a bond, not a stock.",
        },
        {
          prompt: "Why does a company typically issue (sell) new stock?",
          options: [
            "To pay less tax",
            "To raise cash without taking on debt",
            "To lower its share price",
            "Because regulators require it",
          ],
          answer_index: 1,
          explanation:
            "Issuing shares raises money the company never has to repay — the trade-off is giving up a slice of ownership.",
        },
        {
          prompt: "Which of these is NOT a way stockholders earn money?",
          options: [
            "Dividends",
            "Selling shares at a higher price",
            "Guaranteed annual interest",
            "Share buybacks raising the price",
          ],
          answer_index: 2,
          explanation:
            "Stocks never guarantee interest. Guaranteed periodic interest is a feature of bonds.",
        },
      ],
    },
    {
      title: "Reading a stock quote",
      summary: "Ticker, price, market cap, P/E — decoding the numbers you see everywhere.",
      cards: [
        {
          front: "Ticker symbol",
          back: "A short code that uniquely identifies a stock on an exchange. It's the stock's username.",
          example: "AAPL = Apple, TSLA = Tesla, BRK.B = Berkshire Hathaway class B.",
        },
        {
          front: "Market cap = price × total shares",
          back: "The price tag for the entire company. It's how companies are compared by size — not by share price.",
          example:
            "A $900 share price doesn't make a company 'bigger' than a $90 one. Berkshire's A-shares cost ~$600k each; plenty of larger companies have cheaper shares.",
        },
        {
          front: "P/E ratio = price ÷ earnings per share",
          back: "Roughly: how many years of current profit you're paying for. High P/E = investors expect growth; low P/E = cheap or troubled.",
          example:
            "A utility might trade at 12× earnings while a hot AI company trades at 70× — buyers are paying for expected future growth.",
        },
        {
          front: "The bid–ask spread",
          back: "Bid = highest price buyers offer. Ask = lowest price sellers accept. The gap is the cost of trading instantly.",
          example:
            "Heavily traded stocks like Microsoft have a 1-cent spread. A tiny biotech might have a 50-cent spread — you pay that just to get in and out.",
        },
      ],
      questions: [
        {
          prompt: "Company A's share price is $500; Company B's is $50. What can you conclude?",
          options: [
            "Company A is 10× bigger",
            "Company A is more profitable",
            "Nothing yet — you need share counts (market cap)",
            "Company B is a better buy",
          ],
          answer_index: 2,
          explanation:
            "Share price alone says nothing about company size — market cap (price × shares outstanding) is the size measure.",
        },
        {
          prompt: "A very high P/E ratio usually signals that investors…",
          options: [
            "Expect strong future growth",
            "Expect the company to shrink",
            "Will receive large dividends",
            "Can buy shares without fees",
          ],
          answer_index: 0,
          explanation:
            "Paying many multiples of today's earnings only makes sense if you believe earnings will grow substantially.",
        },
      ],
    },
  ]);

  const cs = insSchool.run(
    "School of Computer Science & AI",
    "cs-ai",
    "🤖",
    "From code fundamentals to modern AI systems.",
  ).lastInsertRowid as number;

  const rag = insClass.run(
    cs,
    "RAG Fundamentals",
    "rag-fundamentals",
    "🔍",
    "Retrieval-Augmented Generation: how AI systems look things up before they answer.",
  ).lastInsertRowid as number;

  insertLectures(db, rag, [
    {
      title: "Why RAG exists",
      summary: "LLMs forget, hallucinate, and go stale — retrieval fixes that.",
      cards: [
        {
          front: "LLMs are frozen in time",
          back: "A language model only knows what was in its training data. Anything newer — or private to you — simply doesn't exist for it.",
          example:
            "Ask a 2024-trained model about your company's internal vacation policy and it can only guess — that document was never in its training set.",
        },
        {
          front: "RAG = look it up, then answer",
          back: "Retrieval-Augmented Generation fetches relevant documents first, pastes them into the prompt, and lets the model answer using that fresh context.",
          example:
            "A customer-support bot retrieves the 3 most relevant help-center articles, then answers grounded in them — citing its sources.",
        },
        {
          front: "Embeddings: meaning as numbers",
          back: "Text is converted to vectors where similar meanings land close together. 'How do I reset my password?' sits near 'forgot login credentials'.",
          example:
            "Searching 'my account is locked' retrieves the password-reset doc even though they share zero keywords — the vectors are neighbors.",
        },
        {
          front: "The RAG pipeline in one line",
          back: "Chunk documents → embed chunks → store in a vector DB → embed the user's query → fetch nearest chunks → generate with them in context.",
          example:
            "Notion AI, ChatGPT file-upload, and most 'chat with your docs' products are exactly this pipeline with different polish.",
        },
      ],
      questions: [
        {
          prompt: "What core problem does RAG solve?",
          options: [
            "Models respond too slowly",
            "Models can't access fresh or private information",
            "Models use too much memory",
            "Models can't write code",
          ],
          answer_index: 1,
          explanation:
            "RAG injects retrieved, up-to-date or private context into the prompt, working around the frozen training data.",
        },
        {
          prompt: "In a RAG system, embeddings are used to…",
          options: [
            "Compress documents for storage",
            "Encrypt user queries",
            "Find text with similar meaning to the query",
            "Fine-tune the model nightly",
          ],
          answer_index: 2,
          explanation:
            "Embeddings map text to vectors so semantically similar passages can be found by nearest-neighbor search, even with no shared keywords.",
        },
      ],
    },
  ]);
}
