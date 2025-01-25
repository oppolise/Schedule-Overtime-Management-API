const express = require('express');
const app = express();
const moment = require('moment');
const connectDB = require('./config/db');
const Team = require('./models/team');
const User = require('./models/user');
const Schedule = require('./models/schedule');
const ScheduleDay = require('./models/scheduleDay');
const cors = require('cors');
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

app.use(express.json());
app.use(cors());
connectDB();


app.put('/scheduleDays/:id', async (req, res) => {
  try {
    const scheduleDayId = req.params.id;
    const { isWorkingDay, staffId } = req.body;


    if (!mongoose.Types.ObjectId.isValid(scheduleDayId)) {
      return res.status(400).json({ message: 'Invalid scheduleDayId' });
    }

    const scheduleDay = await ScheduleDay.findById(scheduleDayId);
    if (!scheduleDay) {
      return res.status(404).json({ message: 'ไม่พบ ScheduleDay' });
    }

    if (isWorkingDay && staffId) {
      const staff = await User.findById(staffId);
      if (!staff) {
        return res.status(404).json({ message: 'ไม่พบพนักงาน' });
      }
    }


    scheduleDay.isWorkingDay = isWorkingDay;
    scheduleDay.staffId = isWorkingDay ? staffId : null; // set staffId เป็น null ถ้าเป็นวันหยุด
    await scheduleDay.save();

    res.json(scheduleDay);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});




app.get('/teams/:teamId/users', async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const users = await User.find({ teamId });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});


app.get('/schedules/:scheduleId/calendar', async (req, res) => {
  try {
    const scheduleId = req.params.scheduleId;


    const schedule = await Schedule.findById(scheduleId).populate('staffIds', 'name');
    if (!schedule) {
      return res.status(404).json({ message: 'ไม่พบตารางเวลา' });
    }


    const scheduleDays = await ScheduleDay.find({ scheduleId }).populate('staffId', 'name');


    const calendarData = {};
    for (const day of scheduleDays) {
      const dateString = moment(day.date).format('YYYY-MM-DD');
      calendarData[dateString] = {
        _id: day._id.toString(),
        isWorkingDay: day.isWorkingDay,
        staffName: day.isWorkingDay && day.staffId ? day.staffId.name : null
      };
    }

    res.json(calendarData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { email, password, name, phoneNumber } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'อีเมลนี้มีอยู่ในระบบแล้ว' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      email,
      password: hashedPassword,
      name,
      phoneNumber
    });

    await user.save();

    const token = jwt.sign({ userId: user.id }, 'your_jwt_secret', { expiresIn: '1h' });

    res.status(201).json({ token, userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      { user: { id: user.id } },
      'your_jwt_secret',
      { expiresIn: '1h' }
    );

    res.json({ token, userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
  }
});

app.get('/user-teams/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('กำลังดึงข้อมูลทีมสำหรับผู้ใช้:', userId);
    const teams = await Team.find({ 'members.userId': userId });
    console.log('พบทีม:', teams);

    if (teams.length === 0) {
      return res.status(404).json({ message: 'ไม่พบทีมสำหรับผู้ใช้ี้' });
    }

    const userTeams = teams.map(team => ({
      teamId: team._id,
      teamName: team.name,
      role: team.members.find(member => member.userId.toString() === userId).role
    }));

    res.json(userTeams);
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูลทีมของผู้ใช้:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลทีม' });
  }
});


app.post('/teams/:userId', async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.params.userId;

    const newTeam = new Team({
      name,
      description,
      admin: userId,
      members: [{ userId, role: 'admin' }]
    });

    const savedTeam = await newTeam.save();
    res.status(201).json(savedTeam);
  } catch (error) {
    if (error.code === 11000) {

      return res.status(400).json({ message: 'ชื่อทีมนี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น' });
    }
    console.error('เกิดข้อผิดพลาดในการสร้างทีม:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างทีม' });
  }
});

app.get('/teams/:teamId/members', async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const team = await Team.findById(teamId).populate('members.userId', 'name email');

    if (!team) {
      return res.status(404).json({ message: 'ไม่พบทีมที่ระบุ' });
    }

    const members = team.members.map(member => ({
      _id: member.userId._id.toString(),
      name: member.userId.name,
      email: member.userId.email,
      role: member.role
    }));

    console.log('Sending members:', members); // Debug log
    res.json(members);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสมาชิกทีม' });
  }
});

app.get('/teams/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const teams = await Team.find({ 'members.userId': userId });
    const teamsWithMemberCount = teams.map(team => ({
      ...team.toObject(),
      memberCount: team.members.length
    }));
    res.json(teamsWithMemberCount);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลทีม' });
  }
});


app.get('/users/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('กิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });
  }
});

app.put('/users/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { name, phoneNumber } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    }
    
    if (name) user.name = name;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    
    await user.save();
    
    res.json({ message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ', user: user.toObject({ versionKey: false, transform: (doc, ret) => { delete ret.password; return ret; } }) });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้ใช้:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้ใช้' });
  }
});


app.post('/teams/:teamId/members', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email, role } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'ไม่พบทีมที่ระบุ' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้ที่มีอีเมลนี้' });
    }

    const isAlreadyMember = team.members.some(member => member.userId.toString() === user._id.toString());
    if (isAlreadyMember) {
      return res.status(400).json({ message: 'ผู้ใช้นี้เป็นสมาชิกของทีมอยู่แล้ว' });
    }

    team.members.push({ userId: user._id, role: role || 'staff' });
    await team.save();

    res.status(201).json({ message: 'เพิ่มสมาชิกใหม่เข้าทีมสำเร็จ', team });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการเพิ่มสมาชิกทีม:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มสมาชิกทีม' });
  }
});

app.delete('/teams/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findByIdAndDelete(teamId);
    if (!team) {
      return res.status(404).json({ message: 'ไม่พบทีมที่ระบุ' });
    }

    res.status(200).json({ message: 'ลบทีมสำเร็จ' });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการลบทีม:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบทีม' });
  }
});


app.post('/teams/:teamId/swap-positions', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { adminUserId, otherUserId, date } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'ไม่พบทีมที่ระบุ' });
    }

    const adminMember = team.members.find(member => member.userId.toString() === adminUserId);
    const otherMember = team.members.find(member => member.userId.toString() === otherUserId);

    if (!adminMember || !otherMember) {
      return res.status(400).json({ message: 'ผู้ใช้ทั้งสองต้องเป็นสมาชิกของทีม' });
    }

    if (adminMember.role !== 'admin') {
      return res.status(403).json({ message: 'เฉพาะ admin เท่านั้นที่สามารถสลับตำแหน่งได้' });
    }


    const tempRole = adminMember.role;
    adminMember.role = otherMember.role;
    otherMember.role = tempRole;

    await team.save();

    res.status(200).json({ message: 'สลับตำแหน่งสำเร็จ' });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการสลับตำแหน่ง:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสลับตำแหน่ง' });
  }
});


app.get('/teams/:teamId/latest-schedule', async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const latestSchedule = await Schedule.findOne({ teamId }).sort({ createdAt: -1 });
    
    if (!latestSchedule) {
      return res.status(404).json({ message: 'ไม่พบตารางเวลาล่าสุด' });
    }

    res.json({ scheduleId: latestSchedule._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});


app.post('/schedules', async (req, res) => {
  try {
    const {
      teamId,
      year,
      selectedMonths,
      dateRange = {},
      holidays,
      staffIds,
      createdBy
    } = req.body;


    let startDate, endDate;
    if (selectedMonths.length === 0) {
      startDate = moment([year, 0, 2]).toDate();
      endDate = moment([year, 11, 31]).toDate();
    } else if (dateRange.startDate && dateRange.endDate) {
      startDate = moment(dateRange.startDate).toDate();
      endDate = moment(dateRange.endDate).toDate();
    } else {
      startDate = moment([year, Math.min(...selectedMonths) - 1, 1]).toDate();
      endDate = moment([year, Math.max(...selectedMonths) - 1, 1]).endOf('month').toDate();
    }

    const schedule = new Schedule({
      teamId,
      year,
      month: selectedMonths.length === 1 ? selectedMonths[0] : null,
      startDate,
      endDate,
      createdAt: new Date(),
      createdBy,
      staffIds
    });

    const newSchedule = await schedule.save();


    const scheduleDays = [];
    let staffIndex = 0;

    for (let date = moment(startDate); date.isSameOrBefore(endDate); date.add(1, 'day')) {
      const dayOfWeekName = moment(date).format('ddd');
      const isWorkingDay = !holidays.includes(dayOfWeekName);

      if (isWorkingDay) {
        staffId = newSchedule.staffIds[staffIndex];
        scheduleDays.push({
          scheduleId: newSchedule._id,
          date: date.toDate(),
          isWorkingDay,
          staffId
        });

        staffIndex = (staffIndex + 1) % newSchedule.staffIds.length;
      } else {
        scheduleDays.push({
          scheduleId: newSchedule._id,
          date: date.toDate(),
          isWorkingDay: false,
          staffId: null
        });
      }
    }

    await ScheduleDay.insertMany(scheduleDays);

    res.status(201).json(newSchedule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.delete('/schedules/:id', async (req, res) => { 
  try {
    const scheduleId = req.params.id;

    await ScheduleDay.deleteMany({ scheduleId: scheduleId });

    const deletedSchedule = await Schedule.findByIdAndDelete(scheduleId);
    if (!deletedSchedule) {
      return res.status(404).json({ message: 'ไม่พบตารางเวลา' });
    }

    res.json({ message: 'ลบตารางเวลาสำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});



app.get('/teams/:teamId/users', async (req, res) => {
  try {
    const teamId = req.params.teamId;


    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: 'Invalid teamId' });
    }


    const team = await Team.findById(teamId).populate('members.userId', '-password');
    if (!team) {
      return res.status(404).json({ message: 'ไม่พบทีม' });
    }


    const users = team.members.map(member => ({
      _id: member.userId._id,
      name: member.userId.name,
      email: member.userId.email,
      phoneNumber: member.userId.phoneNumber,
      role: member.role
    }));

    if (users.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้ในทีมนี้' });
    }

    res.json(users);
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
  }
});


app.post('/schedules/:scheduleId/swap-days', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { day1, day2 } = req.body;

    const scheduleDay1 = await ScheduleDay.findOne({ scheduleId, date: day1, isWorkingDay: true });
    const scheduleDay2 = await ScheduleDay.findOne({ scheduleId, date: day2, isWorkingDay: true });

    if (!scheduleDay1 || !scheduleDay2) {
      return res.status(400).json({ message: 'หนึ่งในวันที่เลือกไม่ใช่วันทำงาน' });
    }


    const tempStaffId = scheduleDay1.staffId;
    scheduleDay1.staffId = scheduleDay2.staffId;
    scheduleDay2.staffId = tempStaffId;

    await scheduleDay1.save();
    await scheduleDay2.save();

    res.status(200).json({ message: 'สลับวันทำงานสำเร็จ' });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการสลับวันทำงาน:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสลับวันทำงาน' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


