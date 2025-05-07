import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { insertUserSchema, loginUserSchema, User as SelectUser } from "@shared/schema";
import { z } from "zod";
import { db } from "@db";
import { auditLogs } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Middleware de autenticação para proteção de rotas
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  next();
};

// Middleware para registrar tentativas de login (bem-sucedidas ou falhas)
async function logLoginAttempt(userId: number | null, username: string, success: boolean, ip: string) {
  try {
    await db.insert(auditLogs).values({
      action: success ? 'login_success' : 'login_failed',
      resource: 'auth',
      resourceId: userId ? userId.toString() : null,
      userId: userId,
      details: {
        username,
        ip,
        timestamp: new Date().toISOString(),
      },
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Erro ao registrar tentativa de login:", error);
  }
}

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = randomBytes(32).toString('hex');
    console.warn("SESSION_SECRET not set, using generated secret. This will invalidate sessions on restart.");
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      sameSite: 'lax',
      path: '/'
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate request body against the schema
      const validatedData = insertUserSchema.parse(req.body);

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Nome de usuário já existe" });
      }

      // Hash the password
      const hashedPassword = await hashPassword(validatedData.password);

      // Create the user with hashed password
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        // Don't send the password back
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados de registro inválidos", details: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Erro ao registrar usuário" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');

    try {
      if (!req.body || !req.body.username || !req.body.password) {
        return res.status(400).json({ error: "Dados de login inválidos" });
      }

      // Validate request body against the schema
      const validData = loginUserSchema.parse(req.body);

      // Get client IP for logging
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

      passport.authenticate("local", (err, user, info) => {
        if (err) {
          console.error("SERVIDOR: Erro durante autenticação:", err);
          return next(err);
        }

        if (!user) {
          console.log("SERVIDOR: Usuário não encontrado ou senha inválida");
          // Log failed login attempt
          logLoginAttempt(null, validData.username, false, clientIp);
          return res.status(401).json({ error: "Credenciais inválidas" });
        }

        console.log("SERVIDOR: Usuário autenticado com sucesso:", user.username);

        req.login(user, (err) => {
          if (err) {
            console.error("SERVIDOR: Erro durante login na sessão:", err);
            return next(err);
          }

          console.log("SERVIDOR: Sessão estabelecida com sucesso");

          // Update last login
          storage.updateUser(user.id, { lastLogin: new Date() });

          // Log successful login
          logLoginAttempt(user.id, user.username, true, clientIp);

          // Don't send the password back
          const { password, ...userWithoutPassword } = user;
          console.log("SERVIDOR: Enviando resposta de login bem-sucedido");
          return res.json(userWithoutPassword);
        });
      })(req, res, next);
    } catch (error) {
      console.error("SERVIDOR: Erro durante o login:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados de login inválidos", details: error.errors });
      }
      next(error);
    }
  });

  app.post("/api/logout", requireAuth, (req, res, next) => {
    // Capture user info before logging out for audit
    const userId = req.user.id;
    const username = req.user.username;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    req.logout((err) => {
      if (err) return next(err);

      // Log the logout event
      db.insert(auditLogs).values({
        action: 'logout',
        resource: 'auth',
        resourceId: userId.toString(),
        userId: userId,
        details: {
          username,
          ip: clientIp,
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date(),
      }).catch(error => {
        console.error("Erro ao registrar logout:", error);
      });

      res.status(200).json({ message: "Logout bem-sucedido" });
    });
  });

  // Rota protegida usando o middleware requireAuth
  app.get("/api/user", requireAuth, (req, res) => {
    // Don't send the password back
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}