import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { QueryMatch } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {
  LexicalTypeaheadMenuPlugin,
  TypeaheadOption,
  useBasicTypeaheadTriggerMatch
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import formatHandle from '@lib/formatHandle';
import getIPFSLink from '@lib/getIPFSLink';
import getStampFyiURL from '@lib/getStampFyiURL';
import imageProxy from '@lib/imageProxy';
import { AVATAR } from 'data/constants';
import type { MediaSet, NftImage, Profile, ProfileSearchResult } from 'lens';
import { SearchRequestTypes, useSearchProfilesLazyQuery } from 'lens';
import type { TextNode } from 'lexical';
import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as ReactDOM from 'react-dom';

import { $createMentionNode } from '../Nodes/MentionsNode';

const PUNCTUATION = '\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%\'"~=<>_:;';
const NAME = '\\b[A-Z][^\\s' + PUNCTUATION + ']';

const DocumentMentionsRegex = {
  NAME,
  PUNCTUATION
};

const PUNC = DocumentMentionsRegex.PUNCTUATION;
const TRIGGERS = ['@'].join('');
const VALID_CHARS = '[^' + TRIGGERS + PUNC + '\\s]';
const VALID_JOINS = '(?:' + '\\.[ |$]|' + ' |' + '[' + PUNC + ']|' + ')';
const LENGTH_LIMIT = 75;
const ALIAS_LENGTH_LIMIT = 50;
const SUGGESTION_LIST_LENGTH_LIMIT = 5;

const AtSignMentionsRegex = new RegExp(
  '(^|\\s|\\()(' +
    '[' +
    TRIGGERS +
    ']' +
    '((?:' +
    VALID_CHARS +
    VALID_JOINS +
    '){0,' +
    LENGTH_LIMIT +
    '})' +
    ')$'
);

const AtSignMentionsRegexAliasRegex = new RegExp(
  '(^|\\s|\\()(' + '[' + TRIGGERS + ']' + '((?:' + VALID_CHARS + '){0,' + ALIAS_LENGTH_LIMIT + '})' + ')$'
);

const checkForAtSignMentions = (text: string, minMatchLength: number): QueryMatch | null => {
  let match = AtSignMentionsRegex.exec(text);

  if (match === null) {
    match = AtSignMentionsRegexAliasRegex.exec(text);
  }

  if (match !== null) {
    const maybeLeadingWhitespace = match[1];
    const matchingString = match[3];
    if (matchingString.length >= minMatchLength) {
      return {
        leadOffset: match.index + maybeLeadingWhitespace.length,
        matchingString,
        replaceableString: match[2]
      };
    }
  }

  return null;
};

const getPossibleQueryMatch = (text: string): QueryMatch | null => {
  const match = checkForAtSignMentions(text, 1);
  return match;
};

class MentionTypeaheadOption extends TypeaheadOption {
  name: string;
  picture: string;
  handle: string;

  constructor(name: string, picture: string, handle: string) {
    super(name);
    this.name = name;
    this.handle = handle;
    this.picture = picture;
  }
}

interface Props {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: MentionTypeaheadOption;
}

const MentionsTypeaheadMenuItem: FC<Props> = ({ isSelected, onClick, onMouseEnter, option }) => {
  return (
    <li
      key={option.key}
      tabIndex={-1}
      className="cursor-pointer"
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <div className="m-1.5 flex items-center space-x-2 rounded-xl px-3 py-1 hover:bg-gray-200 dark:text-white dark:hover:bg-gray-800">
        <img
          className="h-7 w-7 rounded-full"
          height="32"
          width="32"
          src={option.picture}
          alt={option.handle}
        />
        <div className="flex flex-col truncate">
          <div className="truncate text-sm">{option.name}</div>
          <span className="text-xs">{formatHandle(option.handle)}</span>
        </div>
      </div>
    </li>
  );
};

const NewMentionsPlugin: FC = () => {
  const [queryString, setQueryString] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>[]>([]);
  const [editor] = useLexicalComposerContext();
  const [searchUsers] = useSearchProfilesLazyQuery();

  const getUserPicture = (user: Profile | undefined) => {
    const picture = user?.picture;
    if (picture && picture.hasOwnProperty('original')) {
      const mediaSet = user.picture as MediaSet;
      return mediaSet.original?.url;
    }

    if (picture && picture.hasOwnProperty('uri')) {
      const nftImage = user.picture as NftImage;
      return nftImage?.uri;
    }

    return getStampFyiURL(user?.ownedBy);
  };

  useEffect(() => {
    if (queryString) {
      searchUsers({
        variables: { request: { type: SearchRequestTypes.Profile, query: queryString, limit: 5 } }
      }).then(({ data }) => {
        const search = data?.search;
        const profileSearchResult = search as ProfileSearchResult;
        const profiles: Profile[] =
          search && search.hasOwnProperty('items') ? profileSearchResult?.items : [];
        const profilesResults = profiles.map(
          (user: Profile) =>
            ({
              name: user?.name,
              handle: user?.handle,
              picture: getUserPicture(user)
            } as Record<string, string>)
        );
        setResults(profilesResults);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  const checkForSlashTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0
  });

  const options = useMemo(
    () =>
      results
        .map(({ name, picture, handle }) => {
          return new MentionTypeaheadOption(name ?? handle, imageProxy(getIPFSLink(picture), AVATAR), handle);
        })
        .slice(0, SUGGESTION_LIST_LENGTH_LIMIT),
    [results]
  );

  const onSelectOption = useCallback(
    (selectedOption: MentionTypeaheadOption, nodeToReplace: TextNode | null, closeMenu: () => void) => {
      editor.update(() => {
        const mentionNode = $createMentionNode(selectedOption.handle);
        if (nodeToReplace) {
          nodeToReplace.replace(mentionNode);
        }
        mentionNode.select().insertText(' ');
        closeMenu();
      });
    },
    [editor]
  );

  const checkForMentionMatch = useCallback(
    (text: string) => {
      const mentionMatch = getPossibleQueryMatch(text);
      const slashMatch = checkForSlashTriggerMatch(text, editor);
      return !slashMatch && mentionMatch ? mentionMatch : null;
    },
    [checkForSlashTriggerMatch, editor]
  );

  return (
    <LexicalTypeaheadMenuPlugin<MentionTypeaheadOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForMentionMatch}
      options={options}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) =>
        anchorElementRef.current && results.length
          ? ReactDOM.createPortal(
              <div className="bg-brand sticky z-40 mt-8 w-52 min-w-full rounded-xl border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <ul className="divide-y dark:divide-gray-700">
                  {options.map((option, i: number) => (
                    <MentionsTypeaheadMenuItem
                      index={i}
                      isSelected={selectedIndex === i}
                      onClick={() => {
                        setHighlightedIndex(i);
                        selectOptionAndCleanUp(option);
                      }}
                      onMouseEnter={() => {
                        setHighlightedIndex(i);
                      }}
                      key={option.key}
                      option={option}
                    />
                  ))}
                </ul>
              </div>,
              anchorElementRef.current
            )
          : null
      }
    />
  );
};

export default NewMentionsPlugin;
