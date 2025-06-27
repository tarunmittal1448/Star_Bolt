import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ReviewTaskCard } from '../../components/intern/ReviewTaskCard';
import { ChevronLeft, Search, Filter, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ReviewTask } from '../../types/review';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const InternTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [availableTasks, setAvailableTasks] = useState<ReviewTask[]>([]);
  const [myTasks, setMyTasks] = useState<ReviewTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch available tasks (not assigned to anyone)
      const { data: availableData, error: availableError } = await supabase
        .from('review_tasks')
        .select(`
          *,
          orders!inner(business_name, business_url)
        `)
        .is('intern_id', null)
        .eq('status', 'pending');

      if (availableError) throw availableError;

      // Fetch my assigned tasks
      const { data: myData, error: myError } = await supabase
        .from('review_tasks')
        .select(`
          *,
          orders!inner(business_name, business_url)
        `)
        .eq('intern_id', user.id);

      if (myError) throw myError;

      // Transform data to match ReviewTask interface
      const transformTask = (task: any): ReviewTask => ({
        id: task.id,
        orderId: task.order_id,
        businessUrl: task.orders.business_url,
        businessName: task.orders.business_name,
        internId: task.intern_id,
        status: task.status,
        assignedAt: task.assigned_at ? new Date(task.assigned_at) : undefined,
        completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
        commission: task.commission,
        guidelines: task.guidelines || [],
      });

      setAvailableTasks((availableData || []).map(transformTask));
      setMyTasks((myData || []).map(transformTask));
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimTask = async (taskId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('review_tasks')
        .update({
          intern_id: user.id,
          status: 'assigned',
          assigned_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      // Refresh tasks
      await fetchTasks();
    } catch (error) {
      console.error('Error claiming task:', error);
      alert('Failed to claim task. Please try again.');
    }
  };

  const filteredAvailableTasks = availableTasks.filter(task => {
    const matchesSearch = task.businessName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredMyTasks = myTasks.filter(task => {
    const matchesSearch = task.businessName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ChevronLeft size={16} />}
              onClick={() => navigate('/intern')}
              className="mr-4"
            >
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Review Tasks</h1>
          </div>
          <Button
            variant="outline"
            leftIcon={<RefreshCw size={16} />}
            onClick={fetchTasks}
            isLoading={loading}
          >
            Refresh
          </Button>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Input
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leftIcon={<Search className="h-4 w-4 text-gray-400" />}
                    fullWidth
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All My Tasks</option>
                  <option value="assigned">Assigned</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <Button variant="outline" size="sm" leftIcon={<Filter size={16} />}>
                More Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Available Tasks */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Available Tasks ({filteredAvailableTasks.length})
            </h2>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading tasks...</div>
            </div>
          ) : filteredAvailableTasks.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAvailableTasks.map((task) => (
                <ReviewTaskCard 
                  key={task.id} 
                  task={task}
                  onClaim={() => handleClaimTask(task.id)}
                  onView={() => {}}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-6 text-center">
                <p className="text-gray-600 font-medium">No available tasks</p>
                <p className="text-gray-500 text-sm mt-1">Check back soon for new review opportunities.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* My Tasks */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              My Tasks ({filteredMyTasks.length})
            </h2>
          </div>
          
          {filteredMyTasks.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMyTasks.map((task) => (
                <ReviewTaskCard 
                  key={task.id} 
                  task={task}
                  onView={() => {}}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-6 text-center">
                <p className="text-gray-600 font-medium">No tasks assigned</p>
                <p className="text-gray-500 text-sm mt-1">Claim a task from the available list above to start earning.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredAvailableTasks.length}
              </div>
              <div className="text-sm text-gray-600">Available Tasks</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {myTasks.filter(t => t.status === 'assigned').length}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {myTasks.filter(t => t.status === 'approved').length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                ${myTasks.filter(t => t.status === 'approved').reduce((sum, t) => sum + t.commission, 0).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Earned</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};