export interface ProjectConfig {
  // Step 1: Project info
  projectName: string;
  description: string;

  // Step 2: Backend
  backend: 'nodejs' | 'python' | 'go' | 'ruby' | 'java' | 'none';
  backendLanguage?: 'typescript' | 'javascript';
  backendFramework?: string;
  javaBuildTool?: 'maven' | 'gradle';

  // Step 3: Frontend
  frontend: 'react' | 'vue' | 'angular' | 'svelte' | 'none';
  frontendMeta?: string;

  // Step 4: Database
  database: 'postgresql' | 'mysql' | 'mongodb' | 'sqlite' | 'none';
  orm?: string;

  // Step 5: Test framework
  testFramework: string;

  // Step 6: MCP
  includeMcp: boolean;

  // Step 7: Hooks
  hooks: {
    startup: boolean;
    sessionEnd: boolean;
    promiseChecker: boolean;
  };

  // Derived
  isMonorepo: boolean;
  languages: string[];
  sourceDirs: string[];
}
