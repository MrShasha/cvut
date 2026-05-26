module.exports = async function createConfig() {
  const math = (await import('remark-math')).default;
  const katex = (await import('rehype-katex')).default;

  return {
    title: 'ČVUT OI výpisky',
    tagline: 'Studijní poznámky z Obsidian vaultu',
    url: 'https://mrshasha.github.io',
    baseUrl: process.env.DOCUSAURUS_BASE_URL ?? '/cvut/',
    organizationName: 'MrShasha',
    projectName: 'cvut',
    trailingSlash: false,
    onBrokenLinks: 'warn',
    markdown: {
      hooks: {
        onBrokenMarkdownLinks: 'warn',
      },
    },
    i18n: {
      defaultLocale: 'cs',
      locales: ['cs'],
    },
    presets: [
      [
        'classic',
        {
          docs: {
            path: 'generated/docs',
            routeBasePath: '/',
            sidebarPath: './sidebars.js',
            breadcrumbs: true,
            showLastUpdateAuthor: false,
            showLastUpdateTime: false,
            remarkPlugins: [math],
            rehypePlugins: [katex],
          },
          blog: false,
          theme: {
            customCss: './src/css/custom.css',
          },
        },
      ],
    ],
    themeConfig: {
      navbar: {
        title: 'ČVUT OI výpisky',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Předměty',
          },
          {
            href: 'https://github.com/MrShasha/cvut',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `© ${new Date().getFullYear()} ČVUT OI výpisky`,
      },
      prism: {
        additionalLanguages: ['bash', 'json', 'sql'],
      },
    },
  };
};
