import { db } from "@db";
import { User, users, patients, professionals, facilities, rooms, insertUserSchema, loginUserSchema, InsertUser, User as SelectUser, LoginUser } from "@shared/schema";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "@db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser: (id: number) => Promise<SelectUser | undefined>;
  getUserByUsername: (username: string) => Promise<SelectUser | undefined>;
  createUser: (user: InsertUser) => Promise<SelectUser>;
  getAllUsers: () => Promise<SelectUser[]>;
  updateUser: (id: number, user: Partial<InsertUser>) => Promise<SelectUser | undefined>;
  validateUser: (credentials: LoginUser) => Promise<SelectUser | null>;
  sessionStore: session.SessionStore;
}

class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'user_sessions'
    });
  }

  async getUser(id: number): Promise<SelectUser | undefined> {
    return await db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  async getUserByUsername(username: string): Promise<SelectUser | undefined> {
    return await db.query.users.findFirst({
      where: eq(users.username, username),
    });
  }

  async createUser(user: InsertUser): Promise<SelectUser> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getAllUsers(): Promise<SelectUser[]> {
    return await db.query.users.findMany();
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<SelectUser | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async validateUser(credentials: LoginUser): Promise<SelectUser | null> {
    const user = await this.getUserByUsername(credentials.username);
    if (!user) return null;
    // Password comparison is handled in auth.ts
    return user;
  }
}

export const storage = new DatabaseStorage();
