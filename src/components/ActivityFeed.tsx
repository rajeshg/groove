"use client";

import { useLiveQuery } from "@tanstack/react-db";
import { Link } from "@tanstack/react-router";
import {
  activitiesCollection,
  boardsCollection,
  itemsCollection,
} from "~/db/collections";
import { Card } from "~/components/ui/card";
import { MessageSquare, Clock } from "lucide-react";
import { useState } from "react";

const ITEMS_PER_PAGE = 25;

export function ActivityFeed() {
  const [selectedBoardId, setSelectedBoardId] = useState<string | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch all activities
  const { data: activitiesData } = useLiveQuery((q) =>
    q.from({ activity: activitiesCollection })
  );

  // Fetch all boards for filtering
  const { data: boardsData } = useLiveQuery((q) =>
    q.from({ board: boardsCollection })
  );

  // Fetch all items to get item titles
  const { data: itemsData } = useLiveQuery((q) =>
    q.from({ item: itemsCollection })
  );

  const activities = activitiesData || [];
  const boards = boardsData || [];
  const items = itemsData || [];

  // Filter activities by selected board
  const filteredActivities = activities.filter((activity: any) => {
    if (selectedBoardId === "all") return true;
    return activity.boardId === selectedBoardId;
  });

  // Sort by most recent first
  const sortedActivities = [...filteredActivities].sort(
    (a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Calculate pagination
  const totalPages = Math.ceil(sortedActivities.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedActivities = sortedActivities.slice(startIndex, endIndex);

  // Group paginated activities by date
  const groupedActivities = paginatedActivities.reduce(
    (groups: any, activity: any) => {
      const date = new Date(activity.createdAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
      return groups;
    },
    {}
  );

  // Reset to page 1 when filter changes
  const handleFilterChange = (boardId: string) => {
    setSelectedBoardId(boardId);
    setCurrentPage(1);
  };

  // Helper to get board info
  const getBoardInfo = (boardId: string) => {
    return boards.find((b: any) => b.id === boardId);
  };

  // Helper to get item info
  const getItemInfo = (itemId: string | null) => {
    if (!itemId) return null;
    return items.find((i: any) => i.id === itemId);
  };

  // Helper to format time
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper to get activity icon color
  const getActivityColor = (type: string) => {
    if (type.includes("moved")) return "text-blue-600 bg-blue-50";
    if (type.includes("comment")) return "text-green-600 bg-green-50";
    if (type.includes("created")) return "text-purple-600 bg-purple-50";
    if (type.includes("updated")) return "text-orange-600 bg-orange-50";
    return "text-slate-600 bg-slate-50";
  };

  return (
    <div className="bg-white dark:bg-slate-950 py-12">
      <div className="w-full max-w-[1600px] mx-auto px-0 sm:px-4 relative z-10">
        {/* Compact Header */}
        <header className="py-8 px-4 border-b border-slate-100 dark:border-slate-800 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-green-600 rounded text-white">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                  Recent Activity
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                  Activity across all your boards
                </p>
              </div>
            </div>

            {/* Board Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 dark:text-slate-400">
                Filter:
              </label>
              <select
                value={selectedBoardId}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Boards</option>
                {boards.map((board: any) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Activity List */}
        <div className="px-4">
          {sortedActivities.length === 0 ? (
            <Card className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border-slate-200 dark:border-slate-800">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <Clock className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <p className="text-slate-900 dark:text-slate-50 font-medium mb-1">
                    No activity yet
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Activity will appear here as you work on your boards
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-6 pb-8">
              {Object.entries(groupedActivities).map(
                ([date, dayActivities]: [string, any]) => (
                  <div key={date}>
                    {/* Date Header */}
                    <div className="sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm py-2 mb-4 border-b border-slate-200 dark:border-slate-800 z-10">
                      <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        {date}
                      </h2>
                    </div>

                    {/* Activities for this day */}
                    <div className="space-y-3">
                      {dayActivities.map((activity: any) => {
                        const board = getBoardInfo(activity.boardId);
                        const item = getItemInfo(activity.itemId);

                        return (
                          <Card
                            key={activity.id}
                            className="p-4 hover:shadow-md transition-shadow bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                          >
                            <div className="flex gap-3">
                              {/* User Avatar */}
                              <div
                                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getActivityColor(
                                  activity.type
                                )}`}
                              >
                                {activity.user?.firstName?.[0] ||
                                  activity.user?.lastName?.[0] ||
                                  "?"}
                              </div>

                              {/* Activity Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-700 dark:text-slate-300">
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        {activity.user?.firstName ||
                                          activity.user?.lastName ||
                                          "System"}
                                      </span>{" "}
                                      <span className="text-slate-600 dark:text-slate-400">
                                        {activity.type
                                          .replace("item_", "")
                                          .replace("_", " ")}
                                      </span>
                                      {activity.content && (
                                        <span className="text-slate-500 dark:text-slate-500">
                                          {" "}
                                          • {activity.content}
                                        </span>
                                      )}
                                    </p>

                                    {/* Board and Item Info */}
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      {board && (
                                        <Link
                                          to="/boards/$boardId"
                                          params={{ boardId: board.id }}
                                          className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        >
                                          <div
                                            className="w-2 h-2 rounded-full"
                                            style={{
                                              backgroundColor:
                                                board.color || "#3b82f6",
                                            }}
                                          />
                                          {board.name}
                                        </Link>
                                      )}
                                      {item && (
                                        <>
                                          <span className="text-slate-300 dark:text-slate-700">
                                            •
                                          </span>
                                          <Link
                                            to="/boards/$boardId/cards/$cardId"
                                            params={{
                                              boardId: activity.boardId,
                                              cardId: item.id,
                                            }}
                                            className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate max-w-[300px]"
                                            title={item.title}
                                          >
                                            {item.title}
                                          </Link>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Timestamp */}
                                  <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                    {formatTime(activity.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )
              )}

              {/* Pagination Controls */}
              <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Previous
                </button>

                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Next
                </button>
              </div>

              {/* Activity Summary */}
              <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
                Showing {startIndex + 1} to{" "}
                {Math.min(endIndex, sortedActivities.length)} of{" "}
                {sortedActivities.length} activities
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
