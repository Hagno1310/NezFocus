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

// Spoilers opened in this message, by position. Kept here, not in each spoiler, so the blocks
// can remount on a reveal: Android dropped the line-through of sibling spans updated in place.
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
export function MessageText({ content }: { content: string }) {
  const { colors } = useTheme();
  const blocks = useMemo(() => parseMessage(content), [content]);
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());
  const opened = useMemo(
    () => ({
      ids,
      reveal: (id: string) => setIds((s) => new Set(s).add(id)),
    }),
    [ids],
  );
  const view = (b: Block, i: number) => (
    <BlockView
      key={`${i}:${ids.size}`}
      block={b}
      colors={colors}
      path={`${i}`}
    />
  );
  return (
    <Opened.Provider value={opened}>
      {blocks.length === 1 && blocks[0]!.t === 'paragraph' ? (
        view(blocks[0]!, 0)
      ) : (
        <View style={styles.blocks}>{blocks.map(view)}</View>
      )}
    </Opened.Provider>
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
