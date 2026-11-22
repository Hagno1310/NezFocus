import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  parseMessage,
  type Block,
  type Inline,
  type MentionNode,
} from '../../domain/messages/markdown';
import {
  fontFamily,
  radius,
  space,
  size,
  typography,
  useTheme,
  type Colors,
} from '../theme';
import { holdSwipe } from './swipeGuard';
import { Text } from './Text';

const open = (url: string) => void Linking.openURL(url).catch(() => {});

// How the screen shows a mention: its label ("@Bình", "#tai-lieu"), or null for plain text
// (MSG-03 AC1: @everyone that did not work); `isMe` gets the `surface-3` chip (C-10).
export type MentionView = {
  label: (m: MentionNode) => string;
  chip: (m: MentionNode) => boolean;
  isMe: (m: MentionNode) => boolean;
  onPress: (m: MentionNode) => void;
};

const plainMentions: MentionView = {
  label: (m) => (m.kind === 'everyone' ? `@${m.id}` : '@'),
  chip: () => false,
  isMe: () => false,
  onPress: () => {},
};
const Mentions = createContext<MentionView>(plainMentions);

// Spoilers opened in this message, by position. Kept here so a reveal can remount the blocks (below).
const Opened = createContext<{
  ids: ReadonlySet<string>;
  reveal: (id: string) => void;
}>({ ids: new Set(), reveal: () => {} });

// C-10 › Nội dung đặc biệt; `hidden` = under a closed spoiler: cover colour, dead links.
function Runs({
  nodes,
  colors,
  hidden,
  path,
}: {
  nodes: Inline[];
  colors: Colors;
  hidden: boolean;
  path: string;
}): ReactNode {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text':
        return n.text;
      case 'bold':
        return (
          <Text key={i} weight="700" style={hidden && hide(colors)}>
            <Runs
              nodes={n.children}
              colors={colors}
              hidden={hidden}
              path={`${path}.${i}`}
            />
          </Text>
        );
      case 'italic':
        return (
          <Text key={i} style={[styles.italic, hidden && hide(colors)]}>
            <Runs
              nodes={n.children}
              colors={colors}
              hidden={hidden}
              path={`${path}.${i}`}
            />
          </Text>
        );
      case 'strike':
        return (
          <Text key={i} style={[styles.strike, hidden && hide(colors)]}>
            <Runs
              nodes={n.children}
              colors={colors}
              hidden={hidden}
              path={`${path}.${i}`}
            />
          </Text>
        );
      case 'code':
        return (
          <Text
            key={i}
            style={[
              styles.code,
              { backgroundColor: colors['surface-2'] },
              hidden && hide(colors),
            ]}
          >
            {n.text}
          </Text>
        );
      case 'link':
        return hidden ? (
          <Text key={i} style={hide(colors)}>
            {n.url}
          </Text>
        ) : (
          <Text
            key={i}
            color="primary"
            accessibilityRole="link"
            onPress={() => open(n.url)}
            style={styles.link}
          >
            {n.url}
          </Text>
        );
      case 'mention':
        return <Mention key={i} node={n} colors={colors} hidden={hidden} />;
      case 'spoiler':
        return (
          <Spoiler
            key={i}
            nodes={n.children}
            colors={colors}
            id={`${path}.${i}`}
          />
        );
    }
  });
}

// C-10 › Mention trong chữ: `surface-2` (mine `surface-3`), `primary` 600.
// ponytail: an inline Text takes no padding or radius on Android; a measured chip view is v1.x.
function Mention({
  node,
  colors,
  hidden,
}: {
  node: MentionNode;
  colors: Colors;
  hidden: boolean;
}) {
  const view = useContext(Mentions);
  const label = view.label(node);
  if (hidden) return <Text style={hide(colors)}>{label}</Text>;
  if (!view.chip(node)) return label;
  return (
    <Text
      weight="600"
      color="primary"
      onPress={() => view.onPress(node)}
      suppressHighlighting
      style={{
        backgroundColor: colors[view.isMe(node) ? 'surface-3' : 'surface-2'],
      }}
    >
      {label}
    </Text>
  );
}

const hide = (colors: Colors) => ({
  color: colors['surface-3'],
  backgroundColor: colors['surface-3'],
  textDecorationLine: 'none' as const,
});

// C-10 Spoiler: a `surface-3` block over the text until tapped.
function Spoiler({
  nodes,
  colors,
  id,
}: {
  nodes: Inline[];
  colors: Colors;
  id: string;
}) {
  const { t } = useTranslation();
  const { ids, reveal } = useContext(Opened);
  const shown = ids.has(id);
  return (
    <Text
      accessibilityRole={shown ? undefined : 'button'}
      accessibilityLabel={shown ? undefined : t('chat.spoiler')}
      onPress={shown ? undefined : () => reveal(id)}
      style={shown ? { backgroundColor: colors['surface-3'] } : hide(colors)}
    >
      <Runs nodes={nodes} colors={colors} hidden={!shown} path={id} />
    </Text>
  );
}

function BlockView({
  block,
  colors,
  path,
}: {
  block: Block;
  colors: Colors;
  path: string;
}) {
  switch (block.t) {
    case 'paragraph':
      return (
        <Text>
          <Runs
            nodes={block.children}
            colors={colors}
            hidden={false}
            path={path}
          />
        </Text>
      );
    case 'quote':
      return (
        <View style={styles.quote}>
          <View
            style={[
              styles.quoteBar,
              { backgroundColor: colors['border-input'] },
            ]}
          />
          <Text color="text-secondary" style={styles.flex}>
            <Runs
              nodes={block.children}
              colors={colors}
              hidden={false}
              path={path}
            />
          </Text>
        </View>
      );
    // C-10: scrolls sideways; the gesture-handler ScrollView keeps the drawer swipe off (SRS 3.1).
    case 'codeblock':
      return (
        <View
          onTouchStart={() => holdSwipe(true)}
          onTouchEnd={() => holdSwipe(false)}
          onTouchCancel={() => holdSwipe(false)}
          style={[
            styles.codeBlock,
            {
              backgroundColor: colors['surface-2'],
              borderColor: colors.border,
            },
          ]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text variant="mono" style={styles.codePad}>
              {block.text}
            </Text>
          </ScrollView>
        </View>
      );
  }
}

// REQ-MSG-02; the 2000 counter counts the typed text with its marks, not this (C-11).
export function MessageText({
  content,
  mentions = plainMentions,
}: {
  content: string;
  mentions?: MentionView;
}) {
  const { colors, scheme } = useTheme();
  const blocks = useMemo(() => parseMessage(content), [content]);
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());
  const opened = useMemo(
    () => ({
      ids,
      reveal: (id: string) => setIds((s) => new Set(s).add(id)),
    }),
    [ids],
  );
  // Gotcha: Android drops the line-through and underline of nested spans restyled in place
  // (a theme switch, a spoiler opening), so those remount the blocks instead.
  const view = (b: Block, i: number) => (
    <BlockView
      key={`${i}:${ids.size}:${scheme}`}
      block={b}
      colors={colors}
      path={`${i}`}
    />
  );
  return (
    <Mentions.Provider value={mentions}>
      <Opened.Provider value={opened}>
        {blocks.length === 1 && blocks[0]!.t === 'paragraph' ? (
          view(blocks[0]!, 0)
        ) : (
          <View style={styles.blocks}>{blocks.map(view)}</View>
        )}
      </Opened.Provider>
    </Mentions.Provider>
  );
}

const QUOTE_BAR = 4;
const CODE_PAD = 12;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  blocks: { gap: space[1] },
  italic: { fontStyle: 'italic' },
  strike: { textDecorationLine: 'line-through' },
  link: { textDecorationLine: 'underline' },
  code: {
    fontFamily: fontFamily.mono,
    fontSize: typography.mono.fontSize,
  },
  quote: { flexDirection: 'row', gap: 12 },
  quoteBar: { width: QUOTE_BAR, borderRadius: radius.badge },
  codeBlock: {
    borderWidth: size.hairline,
    borderRadius: radius.input,
    overflow: 'hidden',
  },
  codePad: { padding: CODE_PAD },
});
