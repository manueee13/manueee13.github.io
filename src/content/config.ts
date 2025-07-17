import { defineCollection, z } from 'astro:content';

const htbWriteups = defineCollection({
    schema: z.object({
        title: z.string(),
        image: z.string().optional(),
        date: z.date(),
        category: z.string(), // "season7", "season1", "machines", "challenges", "sherlocks", etc.
        difficulty: z.string(),
        machine: z.string().optional(),
        tags: z.array(z.string()),
        description: z.string().optional()
    })
});

const ctfWriteups = defineCollection({
    schema: z.object({
        title: z.string(),
        date: z.date(),
        category: z.string(), // web, rev, pwn, crypto, forensics, misc, etc.
        organizer: z.string().optional(), // picoCTF, DEFCON, HTB CTF, etc.
        difficulty: z.string().optional(),
        tags: z.array(z.string()),
        description: z.string().optional(),
        image: z.string().optional()
    })
});

export const collections = {
    htb: htbWriteups,
    ctf: ctfWriteups
};