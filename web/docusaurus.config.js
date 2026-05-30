module.exports = async function createConfig() {
  const math = (await import('remark-math')).default;
  const katex = (await import('rehype-katex')).default;

  return {
    title: 'ČVUT OI výpisky',
    tagline: 'Studijní poznámky z Obsidian vaultu',
    url: 'https://mrshasha.github.io',
    baseUrl: process.env.DOCUSAURUS_BASE_URL ?? '/cvut/',
    favicon: '/img/Spongebob_mini.png',
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
    themes: [
      [
        '@easyops-cn/docusaurus-search-local',
        {
          docsRouteBasePath: '/',
          docsDir: 'generated/docs',
          hashed: true,
          indexBlog: false,
          indexPages: false,
          removeDefaultStemmer: true,
          removeDefaultStopWordFilter: true,
          searchResultLimits: 10,
          searchResultContextMaxLength: 80,
          explicitSearchResultPath: true,
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
            type: 'search',
            position: 'right',
          },
          {
            to: '/graph',
            label: 'Graf',
            position: 'right',
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
