import { Octokit } from 'octokit';
import { GIST_DESCRIPTION } from '../constants';
import { md5 } from '../utils';

export const findExistingGist = async (octokit: Octokit): Promise<string | null> => {
  try {
    // 获取所有gist
    const response = await octokit.rest.gists.list();
    
    // 查找特定描述的gist
    const targetGist = response.data.find(gist => 
      gist.description === GIST_DESCRIPTION
    );

    return targetGist?.id || null;
  } catch (error) {
    console.error('Failed to fetch gists:', error);
    return null;
  }
};

export const getFileName = async (repoInfo: { owner: string; repo: string }, includePattern: string, excludePattern: string, defaultExclude: string) => {
  // 如果include或exclude有值，就把它们组合起来做hash
  const needHash = includePattern || excludePattern !== defaultExclude;
  const hash = needHash
    ? `-${await md5(`include:${includePattern},exclude:${excludePattern}`)}`
    : '';
  return `${repoInfo.owner}-${repoInfo.repo}${hash}.md`;
};

export const createGist = async (octokit: Octokit, fileName: string, content: string) => {
  const response = await octokit.rest.gists.create({
    files: {
      [fileName]: {
        content
      }
    },
    description: GIST_DESCRIPTION,
    public: false
  });

  return {
    id: response.data.id,
    files: response.data.files
  };
};

export const updateGist = async (octokit: Octokit, gistId: string, fileName: string, content: string) => {
  const response = await octokit.rest.gists.update({
    gist_id: gistId,
    files: {
      [fileName]: {
        content
      }
    },
    description: GIST_DESCRIPTION
  });

  return {
    id: response.data.id,
    files: response.data.files
  };
}; 