import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Avatar,
  Box,
  Button,
  Collapse,
  Flex,
  Icon,
  LinkBox,
  LinkOverlay,
  StackDivider,
  Text,
  Input,
  VStack,
} from "@chakra-ui/react";
import { CaretDown, CaretUp, Chat } from "@phosphor-icons/react";
import { format } from "timeago.js";
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";

import {
  createMemeComment,
  CreateCommentResponse,
  getMemeComments,
  getMemes,
  GetMemesResponse,
  getUserById,
} from "../../api";
import { useAuthToken } from "../../contexts/authentication";
import { Loader } from "../../components/loader";
import { MemePicture } from "../../components/meme-picture";


interface Comment {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  author: {
    username: string;
    pictureUrl: string;
  };
}

interface Author {
  id: string;
  username: string;
  pictureUrl: string;
}

type Meme = {
  author: Author;
  comments: Comment[];
  totalComments: number;
} & GetMemesResponse["results"][number];

export const MemeFeedPage: React.FC = () => {
  const token = useAuthToken();
  const [memes, setMemes] = useState<Meme[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [openedCommentSection, setOpenedCommentSection] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState<{[key: string]: string;}>({});
  const [commentPages, setCommentPages] = useState<{ [memeId: string]: number }>({});
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      return await getUserById(token, jwtDecode<{ id: string }>(token).id);
    },
    enabled: !!token
  });

  const onCommentAdded = (newComment: CreateCommentResponse) => {
    if (!user) return;
    const { username, pictureUrl } = user;
    setMemes((prevMemes) =>
      prevMemes.map((meme) =>
        meme.id === newComment.memeId
          ? {
              ...meme,
              comments: [
                {
                  ...newComment,
                  author: { username, pictureUrl },
                },
                ...meme.comments,
              ],
            }
          : meme
      )
    );
  };
  
  const { mutate } = useMutation({
    mutationFn: async (data: { memeId: string; content: string }) => {
      const newComment = await createMemeComment(token, data.memeId, data.content);
      onCommentAdded(newComment);
    },
  });

  const loadMemes = async (page: number) => {
    const data = await getMemes(token, page);
    const authorsPromises = data.results.map(meme => getUserById(token, meme.authorId));
    const authors = await Promise.all(authorsPromises);

    const memesWithCommentsAndAuthors = await Promise.all(data.results.map(async (meme, index) => {
      const firstPageComments = await getMemeComments(token, meme.id, 1);
      const comments = firstPageComments.results || [];
      const commentAuthorsPromises = comments.map(comment => getUserById(token, comment.authorId));
      const commentAuthors = await Promise.all(commentAuthorsPromises);
      const commentsWithAuthors: Comment[] = comments.map((comment, idx) => ({
        ...comment,
        author: commentAuthors[idx],
      }));

      return {
        ...meme,
        author: authors[index],
        comments: commentsWithAuthors,
        totalComments: firstPageComments.total
      } as Meme;
    }));
    return memesWithCommentsAndAuthors;
  };

  useEffect(() => {
    const fetchMemes = async () => {
      const initialMemes = await loadMemes(1);
      setMemes(initialMemes);
      setIsLoadingInitial(false);
    };
    fetchMemes();
  }, [token]);

  const loadMoreMemes = async () => {
    if (isLoadingMore || isLoadingInitial) return;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    const nextMemes = await loadMemes(nextPage);
    setMemes((prevMemes) => [
      ...prevMemes, 
      ...nextMemes.filter(meme => !prevMemes.some(prevMeme => prevMeme.id === meme.id))
    ]);
    setCurrentPage(nextPage);
    setIsLoadingMore(false);
  };

  const loadMoreComments = async (memeId: string) => {
    const currentPage = commentPages[memeId] || 1;
    const meme = memes.find(m => m.id === memeId);
    if (!meme || meme.comments.length >= meme.totalComments) {
      return;
    }
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    const nextCommentsResponse = await getMemeComments(token, memeId, nextPage);
    const nextComments = nextCommentsResponse.results || [];
    const commentAuthorsPromises = nextComments.map(comment => getUserById(token, comment.authorId));
    const commentAuthors = await Promise.all(commentAuthorsPromises);
    const nextCommentsWithAuthors: Comment[] = nextComments.map((comment, idx) => ({
      ...comment,
      author: commentAuthors[idx],
    }));
    setMemes((prevMemes) =>
      prevMemes.map((m) =>
        m.id === memeId
          ? { ...m, comments: [...m.comments, ...nextCommentsWithAuthors] }
          : m
      )
    );
    setCommentPages((prev) => ({
      ...prev,
      [memeId]: nextPage,
    }));
    setIsLoadingMore(false);
  };
  

  const toggleCommentSection = (memeId: string) => {
    const meme = memes.find(m => m.id === memeId);
  
    if (!meme) return;
  
    if (openedCommentSection === memeId) {
      setOpenedCommentSection(null);
    } else {
      setOpenedCommentSection(memeId);
    }
  };
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !isLoadingMore && !isLoadingInitial) {
          loadMoreMemes();
        }
      });
    }, { threshold: 1.0 });
    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }
    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [loaderRef, isLoadingMore, isLoadingInitial]);

  const handleClikMoreComment = () => {
    if (openedCommentSection) {
      loadMoreComments(openedCommentSection)
    }
  }
  if (isLoadingInitial) {
    return <Loader data-testid="meme-feed-loader" />;
  }

  return (
    <Flex width="full" height="full" justifyContent="center" overflowY="auto">
      <VStack
        p={4}
        width="full"
        maxWidth={800}
        divider={<StackDivider border="gray.200" />}
      >
        {memes.map((meme) => (
          <VStack key={meme.id} p={4} width="full" align="stretch">
            <Flex justifyContent="space-between" alignItems="center">
              <Flex>
                <Avatar
                  borderWidth="1px"
                  borderColor="gray.300"
                  size="xs"
                  name={meme.author.username}
                  src={meme.author.pictureUrl}
                />
                <Text ml={2} data-testid={`meme-author-${meme.id}`}>
                  {meme.author.username}
                </Text>
              </Flex>
              <Text fontStyle="italic" color="gray.500" fontSize="small">
                {format(meme.createdAt)}
              </Text>
            </Flex>
            <DndProvider backend={HTML5Backend}>
              <MemePicture
                pictureUrl={meme.pictureUrl}
                texts={meme.texts}
                dataTestId={`meme-picture-${meme.id}`}
              />
            </DndProvider>

            <Box>
              <Text fontWeight="bold" fontSize="medium" mb={2}>
                Description:{" "}
              </Text>
              <Box p={2} borderRadius={8} border="1px solid" borderColor="gray.100">
                <Text color="gray.500" whiteSpace="pre-line" data-testid={`meme-description-${meme.id}`}>
                  {meme.description}
                </Text>
              </Box>
            </Box>
            <LinkBox as={Box} py={2} borderBottom="1px solid black">
              <Flex justifyContent="space-between" alignItems="center">
                <Flex alignItems="center">
                  <LinkOverlay
                    data-testid={`meme-comments-section-${meme.id}`}
                    cursor="pointer"
                    onClick={() => toggleCommentSection(meme.id)}
                  >
                    {/* <Text data-testid={`meme-comments-count-${meme.id}`}> */}
                    <Text data-testid={`meme-comments-count-${meme.id}`}>
                      {meme.totalComments} comments
                    </Text>
                  </LinkOverlay>
                  <Icon
                    as={openedCommentSection !== meme.id ? CaretDown : CaretUp}
                    ml={2}
                    mt={1}
                  />
                </Flex>
                <Icon as={Chat} />
              </Flex>
            </LinkBox>
            <Collapse in={openedCommentSection === meme.id} animateOpacity>
              <Box mb={6}>
              <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (commentContent[meme.id]) {
                        mutate({
                          memeId: meme.id,
                          content: commentContent[meme.id],
                        });
                      }
                    }}
                  >
                    <Flex alignItems="center">
                      <Avatar
                        borderWidth="1px"
                        borderColor="gray.300"
                        name={user?.username}
                        src={user?.pictureUrl}
                        size="sm"
                        mr={2}
                      />
                      <Input
                        placeholder="Type your comment here..."
                        onChange={(event) => {
                          setCommentContent({
                            ...commentContent,
                            [meme.id]: event.target.value,
                          });
                        }}
                        value={commentContent[meme.id]}
                      />
                    </Flex>
                  </form>
                <VStack align="stretch" spacing={4}>
                {meme.comments.map((comment) => (
                  <Box
                    key={comment.id}
                    mt={4}
                    data-testid={`meme-comment-${comment.id}`}
                  >
                    <Flex alignItems="center">
                      <Avatar
                        size="xs"
                        name={comment.author.username}
                        src={comment.author.pictureUrl}
                      />
                      <Text ml={2}>{comment.author.username}</Text>
                      <Text ml="auto" fontStyle="italic" color="gray.500" fontSize="small">
                        {format(comment.createdAt)}
                      </Text>
                    </Flex>
                    <Text>{comment.content}</Text>
                  </Box>
                  ))}
                  {meme.comments.length < meme.totalComments && (
                    <Button onClick={() => handleClikMoreComment()}>Show more comments</Button>
                  )}
                </VStack>
              </Box>
            </Collapse>
          </VStack>
        ))}
        <div ref={loaderRef}>&nbsp;</div>
        {isLoadingMore && <Loader />}
      </VStack>
    </Flex>
  );
};

export const Route = createFileRoute("/_authentication/")({
  component: MemeFeedPage,
});
