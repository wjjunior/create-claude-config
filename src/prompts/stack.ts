import { select, input } from '@inquirer/prompts';

export async function promptBackend() {
  const backend = await select({
    message: 'Backend stack:',
    choices: [
      { name: 'Node.js', value: 'nodejs' },
      { name: 'Python', value: 'python' },
      { name: 'Go', value: 'go' },
      { name: 'Ruby', value: 'ruby' },
      { name: 'Java', value: 'java' },
      { name: 'None', value: 'none' },
    ],
  }) as 'nodejs' | 'python' | 'go' | 'ruby' | 'java' | 'none';

  let backendLanguage: 'typescript' | 'javascript' | undefined;
  let backendFramework: string | undefined;
  let javaBuildTool: 'maven' | 'gradle' | undefined;

  if (backend === 'nodejs') {
    backendLanguage = await select({
      message: 'Language:',
      choices: [
        { name: 'TypeScript', value: 'typescript' },
        { name: 'JavaScript', value: 'javascript' },
      ],
    }) as 'typescript' | 'javascript';

    backendFramework = await select({
      message: 'Framework:',
      choices: [
        { name: 'Express', value: 'express' },
        { name: 'Fastify', value: 'fastify' },
        { name: 'NestJS', value: 'nestjs' },
        { name: 'Other', value: 'other' },
      ],
    });
  } else if (backend === 'python') {
    backendFramework = await select({
      message: 'Framework:',
      choices: [
        { name: 'Django', value: 'django' },
        { name: 'FastAPI', value: 'fastapi' },
        { name: 'Flask', value: 'flask' },
        { name: 'Other', value: 'other' },
      ],
    });
  } else if (backend === 'ruby') {
    backendFramework = await select({
      message: 'Framework:',
      choices: [
        { name: 'Rails', value: 'rails' },
        { name: 'Sinatra', value: 'sinatra' },
        { name: 'Other', value: 'other' },
      ],
    });
  } else if (backend === 'java') {
    backendFramework = await select({
      message: 'Framework:',
      choices: [
        { name: 'Spring Boot', value: 'spring-boot' },
        { name: 'Quarkus', value: 'quarkus' },
        { name: 'Other', value: 'other' },
      ],
    });
    javaBuildTool = await select({
      message: 'Build tool:',
      choices: [
        { name: 'Maven', value: 'maven' },
        { name: 'Gradle', value: 'gradle' },
      ],
    }) as 'maven' | 'gradle';
  }

  if (backendFramework === 'other') {
    backendFramework = await input({ message: 'Framework name:' });
  }

  return { backend, backendLanguage, backendFramework, javaBuildTool };
}

export async function promptFrontend() {
  const frontend = await select({
    message: 'Frontend stack:',
    choices: [
      { name: 'React', value: 'react' },
      { name: 'Vue', value: 'vue' },
      { name: 'Angular', value: 'angular' },
      { name: 'Svelte', value: 'svelte' },
      { name: 'None', value: 'none' },
    ],
  }) as 'react' | 'vue' | 'angular' | 'svelte' | 'none';

  let frontendMeta: string | undefined;

  if (frontend === 'react') {
    frontendMeta = await select({
      message: 'Meta-framework:',
      choices: [
        { name: 'Vite', value: 'vite' },
        { name: 'Next.js', value: 'nextjs' },
        { name: 'CRA', value: 'cra' },
        { name: 'Other', value: 'other' },
      ],
    });
  } else if (frontend === 'vue') {
    frontendMeta = await select({
      message: 'Meta-framework:',
      choices: [
        { name: 'Vite', value: 'vite' },
        { name: 'Nuxt', value: 'nuxt' },
        { name: 'Other', value: 'other' },
      ],
    });
  }

  if (frontendMeta === 'other') {
    frontendMeta = await input({ message: 'Meta-framework name:' });
  }

  return { frontend, frontendMeta };
}

export async function promptDatabase() {
  const database = await select({
    message: 'Database:',
    choices: [
      { name: 'PostgreSQL', value: 'postgresql' },
      { name: 'MySQL', value: 'mysql' },
      { name: 'MongoDB', value: 'mongodb' },
      { name: 'SQLite', value: 'sqlite' },
      { name: 'None', value: 'none' },
    ],
  }) as 'postgresql' | 'mysql' | 'mongodb' | 'sqlite' | 'none';

  return { database };
}
